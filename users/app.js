const ampq = require('amqplib');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const express = require('express');

const app = express();
const port = 3001;

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

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

          const outputDir = path.join(__dirname, 'public/pdf');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const outputPath = path.join(outputDir, `${cvData.cvId}.pdf`);
          const doc = new PDFDocument();
          const stream = fs.createWriteStream(outputPath);

          doc.pipe(stream);

          doc.font('Helvetica-Bold');
          doc.fontSize(24).text('Curriculum Vitae', { align: 'center' });
          doc.moveDown(2);

          doc.font('Helvetica');
          doc.fontSize(16).text(`Nombre: `, { continued: true }).font('Helvetica-Bold').text(cvData.name);
          doc.font('Helvetica').fontSize(16).text(`Edad: `, { continued: true }).font('Helvetica-Bold').text(cvData.age);
          doc.font('Helvetica').fontSize(16).text(`Teléfono: `, { continued: true }).font('Helvetica-Bold').text(cvData.phone);
          doc.font('Helvetica').fontSize(16).text(`Correo Electrónico: `, { continued: true }).font('Helvetica-Bold').text(cvData.email);
          doc.moveDown();

          doc.font('Helvetica-Bold');
          doc.fontSize(18).text('Descripción:');
          doc.font('Helvetica').fontSize(14).text(cvData.description, { indent: 20 });
          doc.moveDown();

          // Línea separadora
          doc.moveDown();
          doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown();

          doc.font('Helvetica-Bold');
          doc.fontSize(18).text('Habilidades:');
          doc.font('Helvetica').fontSize(14);
          Object.values(JSON.parse(cvData.skills)).forEach(skill => {
            doc.text(`• ${skill}`, { indent: 20 });
          });
          doc.moveDown();

          // Línea separadora
          doc.moveDown();
          doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown();

          doc.font('Helvetica-Bold');
          doc.fontSize(18).text('Historial Laboral:');
          doc.font('Helvetica').fontSize(14);
          Object.values(JSON.parse(cvData.workHistory)).forEach(work => {
            doc.text(`• ${work}`, { indent: 20 });
          });
          doc.moveDown();

          // Línea separadora
          doc.moveDown();
          doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown();

          doc.font('Helvetica-Bold');
          doc.fontSize(18).text('Educación:');
          doc.font('Helvetica').fontSize(14);
          Object.values(JSON.parse(cvData.education)).forEach(edu => {
            doc.text(`• ${edu}`, { indent: 20 });
          });
          doc.moveDown();

          doc.end();
          stream.on('finish', () => {
            console.log('PDF generado correctamente');
          });
        }
      }
    },
    { noAck: true }
  );

  console.log('Users connected to RabbitMQ');
  console.log(" [*] Waiting for messages. To exit press CTRL+C");
 } catch (error) {
   console.error('Error connecting to RabbitMQ:', error.message);
   process.exit(1);
 } 
}

main();
