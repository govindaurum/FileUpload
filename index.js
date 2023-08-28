const express = require('express');

const app =express();
const dotenv =require('dotenv')
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
dotenv.config()

const cors =require('cors')

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors())

const AWS = require("aws-sdk");
const s3 = new AWS.S3()
const bodyParser = require('body-parser');

app.use(bodyParser.json())

// curl -i https://some-app.cyclic.app/myFile.txt
app.get('*', async (req,res) => {
  let filename = req.path.slice(1)

  try {
    let s3File = await s3.getObject({
      Bucket: process.env.BUCKET,
      Key: filename,
    }).promise()

    res.set('Content-type', s3File.ContentType)
    res.send(s3File.Body.toString()).end()
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.log(`No such key ${filename}`)
      res.sendStatus(404).end()
    } else {
      console.log(error)
      res.sendStatus(500).end()
    }
  }
})


// curl -i -XPUT --data '{"k1":"value 1", "k2": "value 2"}' -H 'Content-type: application/json' https://some-app.cyclic.app/myFile.txt
app.post('/upload',upload.single('mergedPdf'), async (req,res) => {

  if (!req.file) {
    return res.status(400).json({ error: 'No merged PDF file uploaded' });
  }
  let filename = `${uuidv4()}.pdf`;

  console.log(typeof req.body)

  // await s3.putObject({
  //   Body: req.file.buffer,,
  //   Bucket: process.env.BUCKET,
  //   Key: filename,
  // }).promise()
  const params = {
    Bucket: process.env.BUCKET,
    Key: filename,
    Body: req.file.buffer,
  };

  s3.upload(params, (error, data) => {
    if (error) {
      console.error('Error uploading to S3:', error);
      return res.status(500).json({ error: 'Error uploading to S3' });
    }

    const uploadedLink = data.Location;
    res.json({ link: uploadedLink });
  })
  
})

// curl -i -XDELETE https://some-app.cyclic.app/myFile.txt
app.delete('*', async (req,res) => {
  let filename = req.path.slice(1)

  await s3.deleteObject({
    Bucket: process.env.BUCKET,
    Key: filename,
  }).promise()

  res.set('Content-type', 'text/plain')
  res.send('ok').end()
})

// /////////////////////////////////////////////////////////////////////////////
// Catch all handler for all other request.
app.use('*', (req,res) => {
  res.sendStatus(404).end()
})
 
// /////////////////////////////////////////////////////////////////////////////
// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`index.js listening at http://localhost:${port}`)
})