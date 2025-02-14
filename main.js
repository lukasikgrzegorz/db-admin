require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT;
const DATABASE = `${process.env.DATABASE}.db`;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

app.use(bodyParser.json());

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);
    if (token !== AUTH_TOKEN) return res.sendStatus(403);

    next();
}

const db = new sqlite3.Database(DATABASE, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

app.post('/', authenticateToken, (req, res) => {
    const { commands } = req.body;

    if (commands && Array.isArray(commands)) {
        let results = [];
        let completedCommands = 0;

        db.serialize(() => {
            commands.forEach((command, index) => {
                if (command.trim().toUpperCase().startsWith('SELECT')) {
                    db.all(command, [], (err, rows) => {
                        if (err) {
                            results.push({ commandIndex: index, error: err.message });
                        } else {
                            results.push({ commandIndex: index, rows });
                        }
                        completedCommands++;
                        if (completedCommands === commands.length) {
                            res.json(results);
                        }
                    });
                } else {
                    db.exec(command, (err) => {
                        if (err) {
                            results.push({ commandIndex: index, error: err.message });
                        } else {
                            results.push({ commandIndex: index, message: 'Command executed successfully' });
                        }
                        completedCommands++;
                        if (completedCommands === commands.length) {
                            res.json(results);
                        }
                    });
                }
            });
        });
    } else {
        res.status(400).json({ error: 'No commands provided' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});