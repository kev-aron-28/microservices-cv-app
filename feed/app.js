const memcachedHost = process.env.MEMCACHED_HOST || 'localhost';
const memcachedPort = process.env.MEMCACHED_PORT || '11211';

const Memcached = require('memcached');
const memcached = new Memcached(`${memcachedHost}:${memcachedPort}`);
const ampq = require('amqplib');


const RABBIT_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const QUEUE_NAME = 'user_queue';


const main = async () => {
  try {
 
   process.once("SIGINT", async () => {
     await channel.close();
     await connection.close();
   });
 
   const connection = await ampq.connect('amqp://rabbitmq');
   const channel = await connection.createChannel();
 
   await channel.assertQueue(QUEUE_NAME, { durable: true });
 
   await channel.consume(
     QUEUE_NAME,
     (message) => {
       if (message) {
          const cvData = JSON.parse(message.content.toString());

          if(cvData.type === 'cv_created') {
            memcached.get('new_users', (err, data) => {
              if(err) {
                throw new Error('Something failed');
              }

              if(data) {
                const users = JSON.parse(data);
                users.push(cvData);

                memcached.set('new_users', JSON.stringify(users), 10, (err) => {
                  if(err) {
                    throw new Error('Something failed');
                  }
                });
              } else {
                const data = []
                data.push(cvData)
                memcached.set('new_users', JSON.stringify(data), 10, (err) => {
                  if(err) {
                    throw new Error('Something failed');
                  }
                })
              }
            });
          }
        }
       },
     { noAck: true }
   );
 
   console.log('feed connected to RabbitMQ');
   console.log(" [*] Waiting for messages. To exit press CTRL+C");
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error.message);
    process.exit(1);
  } 
}
 
main();
