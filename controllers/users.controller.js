const dbClient = require('../utils/').dbClient;
const database = dbClient.db(process.env.MONGO_DB_DATABASE);
const collection = database.collection('users');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { ObjectId } = require('mongodb');
const { myPassportLocal } = require('../passport');

// const client = require('../utils/db-client.util');

exports.findAll = async (req, res) => {
    const data = await collection.find({}).toArray();
    console.log(data);
    res.status(200).json(data);
};

exports.findOne = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({
            message: 'No id provided',
        });
    }
    const data = await collection.findOne({ _id: new ObjectId(id) });
    if (!data) {
        res.status(404).json({
            message: `No user found with id ${id}`,
        });
    }
    res.status(200).json(data);
};
exports.create = async (req, res) => {
    const schema = Joi.object({
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        active: Joi.bool().required(),
    });

    const { body } = req;

    const { value, error } = schema.validate(body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    const { username, email, password, ...rest } = value;
    // Check for existing username or email
    const existingUser = await collection.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        return res
            .status(409)
            .json({ message: 'Username or email already exists' });
    }

    //on efface le
    delete password;
    const hash = await bcrypt.hash(password, 10);

    const data = await collection
        .insertOne({
            password: hash,
            username,
            email,
            ...rest,
        })
        .catch((err) => {
            console.log(err);
            return { error: 'impossible to save this record!' };
        });
    res.status(201).json(value);
    // res.status(201).json(data);
};
exports.updateOne = async (req, res) => {};
exports.deleteOne = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({
            message: 'No id provided',
        });
    }
    const { force } = req.query;

    if (force === undefined || parseInt(force, 10) === 0) {
        // suppression logique
        const data = await collection.updateOne(
            { _id: id }, // filter
            {
                $set: {
                    deletedAt: new Date(),
                },
            }
        );
        res.status(200).json(data);
    }

    if (parseInt(force, 10) === 1) {
        // suppression physique
        await collection.deleteOne({ _id: id });
        res.status(204);
    }

    res.status(400).json({
        message: 'Malformed parameter "force"',
    });
};
