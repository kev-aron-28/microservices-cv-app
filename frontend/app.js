const express = require('express');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const ampq = require('amqplib');
const { v4: uuidv4 } = require('uuid');

const { PrismaClient } = require('@prisma/client');
const initializePassport = require('./auth/passport-config');
const e = require('express');


const app = express();
const port = 3000;

const prisma = new PrismaClient();

initializePassport(passport);
let connection;

const RABBIT_HOST = process.env.RABBITMQ_HOST || 'localhost';
const QUEUE_NAME = 'user_queue';


const startRabbitMQ = async () => {
  try {
   connection = await ampq.connect('amqp://rabbitmq');
   const channel = await connection.createChannel();
 
   await channel.assertQueue(QUEUE_NAME, { durable: true });
   console.log('Frontend connected to RabbitMQ');
   console.log(" [*] Waiting for messages. To exit press CTRL+C");
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error.message);
    process.exit(1);
  } 
 }
 
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.use(express.static('public'));


function ensureAuthenticated(req, res, next) {
  console.log(req.user)
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

app.get('/', (req, res) => {
  res.render('landing');
});

app.post('/register', async (req, res) => {
  try {
    const { userType, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: userType,
        id: uuidv4()
      }
    });

    req.login(user, (err) => {
      if(err) {
        return next(err);
      }

      if(user.role === 'employee') {
       return res.redirect('/cv/create');
      }

      return res.redirect('/employer/create');

    });
  } catch (error) {
    return res.render('error', {
      message: 'Ocurrio un error'
    });
  }
});



app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        email
      }
    })

    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
      return res.render('error', {
        message: 'Wrong password'
      });
    }

    req.login(user, (err) => {
      if(err) {
        return next(err);
      }
      res.redirect('/me');
    });
    
  } catch (error) {
    res.redirect('/');
  }
});


app.get('/employer/create', ensureAuthenticated, (req, res) => res.render('create-employer'))
app.post('/employer/create', ensureAuthenticated, async (req, res) => {
  try {
    const { companyName, industry, description } = req.body;
    await prisma.employer.create({
        data: {
            companyName,
            industry,
            description,
            userId: req.user.id, 
        },
    });

    res.redirect('/me');
  } catch (error) {
    return res.render('error', {
      message: 'Ocurrio un error'
    });
  }
});

app.get('/me', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  if(user.role === 'employee') {
    const cv = await prisma.cV.findFirst({
      where: {
        employee: {
          userId: user.id
        }
      }
    });
  
    res.render('me', {
      cv
    });
  } else {
    const employer = await prisma.employer.findUnique({
      where: {
        userId: user.id
      }
    })

    res.render('employer', {
      employer
    });
  }

})


app.get('/feed', ensureAuthenticated, async (req, res) => {
  try {
    const users = await prisma.cV.findMany({});

    res.render('feed', {
      users,
      newUsers: []
    });
  } catch (error) {
    return res.render('error', {
      message: 'Ocurrio un error'
    });
  }
});

app.get('/cv/create', ensureAuthenticated, (req, res) => res.render('create-cv'));
app.post('/cv/create', ensureAuthenticated, async (req, res) => {
  try {
    const { name, age,  phone, email, description, skills, workHistory, education } = req.body;
    
    const skilsJSON = JSON.parse(skills);
    const workHistoryJSON = JSON.parse(workHistory);
    const educationJSON = JSON.parse(education);
    const user = req.user;

    if(!connection) res.render('error', {
      message: 'No se pudo crear el CV'
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME);

    const cvId = uuidv4();
    await prisma.cV.create({
      data: {
        id: cvId,
        name,
        phone,
        email,
        description,
        skills: skilsJSON,
        workHistory: workHistoryJSON,
        education: educationJSON,
        employee: {
          create: {
            age: Number(age),
            name,
            user: { 
              connect: {
                id: user.id
              }
            },
            cvId
          }
        }
      }
    });
  

    const message = {
      cvId,
      name, 
      age,  
      phone, 
      email, 
      description, 
      skills, 
      workHistory, 
      education,
      type: 'cv_created'
    }    
    
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)));
    res.redirect('/me');
    
  } catch (error) {
    console.log(error);
    res.render('error', {
      message: 'No se pudo crear el CV'
    });
  }
});

app.listen(port, async () => {
  await startRabbitMQ();
  console.log(`Server running on port ${port}`);
});
