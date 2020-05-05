require('dotenv').config();
import express, { Router, Request, Response } from 'express';
import multer, { memoryStorage } from 'multer';

import { MongoClient, ObjectID, GridFSBucket, Db } from 'mongodb';

import { Readable } from 'stream';

const app = express();

const router = Router();

// Any because in line 23 its ok, but in 38 gives an error...
// Types MongoClient (23) and Db (39) are diff :(
let db: any;

MongoClient.connect(
	process.env.MONGO_URI || 'mongodb://localhost:27017/audio-fun-service',
	(err, database) => {
		if (err) {
			console.error('MongoDB Connection Error');
			process.exit(1);
		}
		db = database;
	}
);

// GET /audios/:id
router.get('/:id', (req: Request, res: Response) => {
	// Treat this validation error here in other time :)
	const audioId = new ObjectID(req.params.id);

	res.set('content-type', 'audio/mp3');
	res.set('accept-ranges', 'bytes');

	let bucket = new GridFSBucket(db, { bucketName: 'audios' });

	let downloadStream = bucket.openDownloadStream(audioId);

	downloadStream.on('data', (chunk) => {
		res.write(chunk);
	});

	downloadStream.on('error', () => {
		res.sendStatus(404);
	});

	downloadStream.on('end', () => {
		res.end();
	});
});

// POST /audios
router.post('/', (req: Request, res: Response) => {
	const storage = memoryStorage();

	const upload = multer({
		storage,
		limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 },
	});

	upload.single('audio')(req, res, (err) => {
		if (err) {
			return res
				.status(400)
				.json({ message: 'Upload Request Validation Failed' });
		} else if (!req.body.name) {
			return res.status(400).json({ message: 'No audio name in request body' });
		}

		const audioName = req.body.name;

		// Convert Buffer to Readable Stream
		const readableAudioStream = new Readable();
		readableAudioStream.push(req.file.buffer);
		readableAudioStream.push(null);

		let bucket = new GridFSBucket(db, {
			bucketName: 'audios',
		});

		let uploadStream = bucket.openUploadStream(audioName);
		let id = uploadStream.id;
		readableAudioStream.pipe(uploadStream);

		uploadStream.on('error', () => {
			return res.status(500).json({ message: 'Error uploading file' });
		});

		uploadStream.on('finish', () => {
			return res
				.status(201)
				.json({
					message:
						'File uploaded successfully, stored with Mongo ObjectID: ' + id,
				});
		});
	});
});

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
	console.log(`Audio Fun Service running on port ${PORT}`);
});
