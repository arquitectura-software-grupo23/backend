const fs = require('fs');
const path = require('path');
const PDF = require('pdf-creator-node');
const AWS = require('aws-sdk');
const htmlTemplate = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const imagePath = path.join(__dirname, 'image.txt');
const imageBuffer = fs.readFileSync(imagePath);

// Configura AWS SDK
AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();

async function generateInvoice(userData, stock) {
    const document = {
        html: htmlTemplate,
        data: {
            image: imageBuffer,
            userData: userData,
            stock: stock
        },
        type: "buffer", // Indica que queremos que el PDF se genere como Buffer
    };

    try {
        const pdfBuffer = await PDF.create(document, {});
        
        // Configura los parámetros para S3
        const params = {
            Bucket: 'voucher-g23',
            Key: 'boleta.pdf', 
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        };

        // Sube el archivo a S3
        await s3.upload(params).promise();

        console.log("Archivo subido exitosamente a S3.");

    } catch (error) {
        console.error(error);
        throw error;  // Lanza el error para que Lambda lo registre
    }
}

module.exports.main = async (event) => {
    const userData = {
        name: "Juan Perez",
        email: "juan@example.com"
    };
    const stock = { name: "Stock A", quantity: 10, price: "$100" };

    // Llama a la función para generar la boleta
    await generateInvoice(userData, stock);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "PDF generado y subido a S3." }),
    };
};
