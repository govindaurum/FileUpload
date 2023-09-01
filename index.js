const express = require('express');

const app =express();
const dotenv =require('dotenv')
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('@cyclic.sh/s3fs') 
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
// const router =express.Router();
dotenv.config()

const cors =require('cors')
app.use(cors())



// const AWS = require("aws-sdk");
// const s3 = new AWS.S3()
const bodyParser = require('body-parser');




// async function listObjects(bucketName) {
  //   const params = { Bucket: bucketName };

//   try {
  //     const response = await s3.listObjectsV2(params).promise();
//     return response.Contents;
//   } catch (error) {
  //     console.error('Error listing objects:', error);
//     throw error;
//   }
// }

// // Usage
// const bucketName = process.env.BUCKET; // Replace with your bucket name
// listObjects(bucketName)
//   .then((objects) => {
  //     console.log('Objects in the bucket:');
//     objects.forEach((object) => {
  //       console.log(object.Key);
  //     });
  //   })
  //   .catch((error) => {
    //     console.error('Error:', error);
    //   });

    
    //   async function getObject(bucketName, objectKey, localFilePath) {
      //     const params = {
        //       Bucket: bucketName,
  //       Key: objectKey,
  //     };
  
  //     try {
    //       const response = await s3.getObject(params).promise();
//       fs.writeFileSync(localFilePath, response.Body);
//       console.log(`Object '${objectKey}' downloaded to ${localFilePath}`);
//     } catch (error) {
  //       console.error('Error downloading object:', error);
  //       throw error;
  //     }
//   }

//   // Usage
//  // Replace with your bucket name
//   const objectKey = 'ab0e7c68-6fcc-47db-b230-8a55e36434e7.jpg'; // Replace with the image's S3 object key
//   const localFilePath = 'C:/react projects/ab0e7c68-6fcc-47db-b230-8a55e36434e7.jpg'; // Local file path to save the downloaded image
//   getObject(bucketName, objectKey, localFilePath)
//     .catch((error) => {
  //       console.error('Error:', error);
//     });





  





const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const BUCKET_NAME = "cyclic-fair-ruby-clam-cuff-us-east-1";

const REGION = "us-east-2";

const s3 = new S3Client({ region:REGION });

    app.use(bodyParser.json())
    
    app.post("/presigned",  async (req, res) => {
      console.log(req.body)
        const file_name = req.body.name
        const file_type = req.body.type
        const { url, fields } = await createPresignedPost(s3, {
            Bucket: process.env.BUCKET,
            Key: `uploads/${file_name}`,
            Fields : {
                'Content-Type': file_type
            }
        });
    
      return res.json({
        url,
        fields,
      }); 
    }); 
    
    app.post("/download", async (req, res) => {
        let key = req.body.Key
        let download_url = await getSignedUrl(s3, new GetObjectCommand({
                Bucket: process.env.BUCKET,
                Key: key,
        })) 
        console.log(download_url)
        return res.send({download_url});
    });
    
    app.post("/delete", async (req, res) => {
        let key = req.body.Key
        let result = await s3.send(new DeleteObjectCommand({
                Bucket: process.env.BUCKET,
                Key: key,
        })) 
        return res.send({result});
    });
    
    app.get("/list_uploads", async (req, res) => {
        let bucket_data = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.BUCKET,
            Prefix: 'uploads'
        }));
        let bucket_contents = bucket_data.Contents || []
    
        return res.json(bucket_contents);
    });
    
    app.get("/list_uploads/presigned", async (req, res) => {
        let bucket_data = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.BUCKET,
            Prefix: 'uploads'
        }));
    
        let bucket_contents = bucket_data.Contents || []
        bucket_contents = await Promise.all(bucket_contents.map(async f=>{
            f.presigned_url = await getSignedUrl(s3, new GetObjectCommand({
                Bucket: process.env.BUCKET,
                Key: f.Key,
            })) 
            return f
        }))
    
        bucket_contents = bucket_contents.sort((a,b) => b.LastModified - a.LastModified);
    
    
        return res.json(bucket_contents);
    });
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`index.js listening at http://localhost:${port}`)
})