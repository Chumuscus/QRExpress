document.getElementById('qrForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const form = e.target;
  const modifiers = {
    data: form.data.value,
    inverted: form.inverted.checked,
    blockSize: parseInt(form.blockSize.value,10) || 10,
    radius: parseInt(form.radius.value,10) || 0,
    foregroundColor: form.foregroundColor.value,
    backgroundColor: form.backgroundColor.value,
    addImage: form.addImage.checked,
    image: form.image.value,
    imageSize: parseInt(form.imageSize.value,10) || 30,
    imageMargin: parseInt(form.imageMargin.value,10) || 10,
    errorCorrectionLevel: form.errorCorrectionLevel.value,
    format: form.format.value
  };
  try{
    const response = await fetch('/api/qr',{
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(modifiers)
    });
    const result = await response.text();
    if(modifiers.format==='svg'){
      const base64Svg = result.split(',')[1];
      const svgText = atob(base64Svg);
      document.getElementById('qrSvg').style.display='block';
      document.getElementById('qrSvg').innerHTML = svgText;
      document.getElementById('qrImage').style.display='none';
    } else {
      document.getElementById('qrImage').style.display='block';
      document.getElementById('qrImage').src = result;
      document.getElementById('qrSvg').style.display='none';
    }
  } catch(error){
    console.error('Error generating QR code:', error);
  }
});
