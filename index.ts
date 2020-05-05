require('dotenv').config();
import express, { Router, Request, Response } from 'express';
import multer from 'multer';

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
