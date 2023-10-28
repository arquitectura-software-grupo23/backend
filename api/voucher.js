const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
require('dotenv').config();

function enviarCorreo(destinatario, token_ws) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: destinatario,
    subject: 'Compra exitosa en Stocknet',
    text: `Su compra ha sido exitosa. Puede acceder a su boleta desde el siguiente link https://voucher-g23.s3.amazonaws.com/grupo23-${token_ws}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Correo enviado: ${info.response}`);
    }
  });
}

function invocarFuncionLambda(name, mail, deposit_token, symbol, quantity, price) {
  AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: 'us-east-1',
  });

  const lambda = new AWS.Lambda();

  const params = {
    FunctionName: 'serverless-nodejs-app-dev-hello',
    Payload: JSON.stringify({
      name,
      mail,
      stockName: symbol,
      stockQuantity: quantity,
      stockPrice: price,
      pdfName: deposit_token,
    }),
  };
  console.log(params);

  lambda.invoke(params, (err) => {
    if (err) {
      console.log('Error al invocar la función Lambda:', err);
    } else {
      enviarCorreo(mail, deposit_token);
    }
  });
}

module.exports = invocarFuncionLambda;
