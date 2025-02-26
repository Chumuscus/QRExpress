const express = require('express');
const qrcode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');

const router = express.Router();
const PERCENTAGE = 0.01;

function getImageData(qrSize, modifiers) {
  const blockSize = modifiers.blockSize;
  const imageSize = modifiers.imageSize * PERCENTAGE;
  const sizeInModules = (2 * Math.floor((qrSize * imageSize) / 2) + 1);
  const size = sizeInModules * blockSize;
  const position = (Math.floor(qrSize / 2) - Math.floor(sizeInModules / 2)) * blockSize;
  return {
    image: modifiers.image,
    size: size,
    position: position,
    show: modifiers.addImage
  };
}

function isInsideImage(x, y, start, end) {
  return x >= start && x < end && y >= start && y < end;
}

function renderQr(qr, modifiers, imageData) {
  const qrSize = qr.modules.size;
  const qrData = qr.modules.data;
  const { blockSize, foregroundColor, backgroundColor, inverted, addImage, imageMargin } = modifiers;
  const { position, size } = imageData;
  const radius = (blockSize / 2) * (modifiers.radius * PERCENTAGE);
  const margin = Math.floor(imageMargin / blockSize) * blockSize;
  const ignoreStart = position - margin;
  const ignoreEnd = position + size + margin;
  const qrSvgList = [];
  
  for (let i = 0; i < qrSize; i++) {
    for (let j = 0; j < qrSize; j++) {
      const row = i * qrSize;
      const squareType = qrData[row + j] ^ Number(inverted);
      let color = squareType ? foregroundColor : backgroundColor;
      const x = j * blockSize;
      const y = i * blockSize;
      
      if (addImage && isInsideImage(x, y, ignoreStart, ignoreEnd)) {
        color = inverted ? foregroundColor : backgroundColor;
      }
      
      const rect = `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" rx="${radius}" fill="${color}"/>`;
      qrSvgList.push(rect);
    }
  }
  
  return qrSvgList;
}

function svg(svgSize, qrSvgList) {
  return `<svg version="1.1" width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">
    ${qrSvgList.join('')}
  </svg>`;
}

async function svgToImage(svgBase64, size, desiredFormat, imageData) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const qr = await loadImage(svgBase64);
  ctx.drawImage(qr, 0, 0);

  if (imageData.show) {
    const imagePosition = imageData.position;
    const imageSize = imageData.size;
    try {
      const loadedImage = await loadImage(imageData.image);
      ctx.drawImage(loadedImage, imagePosition, imagePosition, imageSize, imageSize);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }
  
  const format = "image/" + desiredFormat;
  const buffer = canvas.toBuffer(format);
  const base64 = buffer.toString("base64");
  return "data:image/" + desiredFormat + ";base64," + base64;
}

async function addImagetoSvg(svgBase64, size, imageData) {
  const canvas = createCanvas(size, size, "svg");
  const ctx = canvas.getContext("2d");
  const qr = await loadImage(svgBase64);
  ctx.drawImage(qr, 0, 0);

  if (imageData.show) {
    const imagePosition = imageData.position;
    const imageSize = imageData.size;
    const loadedImage = await loadImage(imageData.image);
    ctx.drawImage(loadedImage, imagePosition, imagePosition, imageSize, imageSize);
  }
  
  const buffer = canvas.toBuffer();
  const base64 = buffer.toString("base64");
  return "data:image/svg;base64," + base64;
}

async function generateQR(modifiers) {
  modifiers.data = modifiers.data || "https://moodle.ingenieria.lasalle.mx/course/view.php?id=41";
  modifiers.inverted = (modifiers.inverted !== undefined) ? modifiers.inverted : false;
  modifiers.blockSize = modifiers.blockSize || 10;
  modifiers.radius = modifiers.radius || 0;
  modifiers.foregroundColor = modifiers.foregroundColor || "#000000";
  modifiers.backgroundColor = modifiers.backgroundColor || "#ffffff";
  modifiers.addImage = (modifiers.addImage !== undefined) ? modifiers.addImage : true;
  modifiers.image = modifiers.image || "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Logo_de_la_Universidad_La_Salle_sin_letras.svg/1200px-Logo_de_la_Universidad_La_Salle_sin_letras.svg.png";
  modifiers.imageSize = modifiers.imageSize || 30;
  modifiers.imageMargin = modifiers.imageMargin || 10;
  modifiers.errorCorrectionLevel = modifiers.errorCorrectionLevel || "H";
  modifiers.format = modifiers.format || "png";
  
  const options = { errorCorrectionLevel: modifiers.errorCorrectionLevel };
  const code = qrcode.create(modifiers.data, options);
  const qrSize = code.modules.size;
  const svgSize = modifiers.blockSize * qrSize;
  
  const imageData = getImageData(qrSize, modifiers);
  const qrSvgList = renderQr(code, modifiers, imageData);
  const qrSvg = svg(svgSize, qrSvgList);
  const svgBase64 = "data:image/svg;base64," + Buffer.from(qrSvg).toString('base64');
  
  let returnValue;
  if (modifiers.format === "svg") {
    returnValue = await addImagetoSvg(svgBase64, svgSize, imageData);
  } else if (modifiers.format === "jpg" || modifiers.format === "jpeg") {
    returnValue = await svgToImage(svgBase64, svgSize, "jpeg", imageData);
  } else {
    returnValue = await svgToImage(svgBase64, svgSize, "png", imageData);
  }
  
  return returnValue;
}

router.post('/', async (req, res) => {
  try {
    const modifiers = req.body;
    const imageData = await generateQR(modifiers);
    res.set({
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    res.send(imageData);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating QR code');
  }
});

module.exports = router;
