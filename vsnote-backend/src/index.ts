import "reflect-metadata";
import express from "express";
require("dotenv-safe").config();
import { createConnection } from "typeorm";
import { __prod__ } from "./constants";
import { join } from 'path';
import { User } from "./entities/User";
import passport from 'passport';
import { Strategy as GitHubStrategy } from "passport-github";
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { Todo } from "./entities/Todo";
import { isAuth } from "./isAuth";

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5001/auth/github/callback"
},
    async (_, __, profile, cb) => {
        let user = await User.findOne({ where: { githubId: profile.id } });
        if (user) {
            user.name = profile.displayName;
            await user.save();
        } else {
            user = await User.create({
                name: profile.displayName,
                githubId: profile.id,
            }).save();
        }

        cb(null, { accessToken: jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1y", }), });
    }
));

const main = async () => {
    await createConnection({
        type: 'postgres',
        username: 'postgres',
        password: 'Akhil099',
        entities: [join(__dirname, "./entities/*.*")],
        logging: !__prod__,
        synchronize: !__prod__,
    });

    const app = express();

    passport.serializeUser((user: any, done) => {
        done(null, user.accessToken);
    });
    app.use(cors({ origin: '*' }));

    app.use(passport.initialize());

    app.use(express.json());

    app.get('/auth/github', passport.authenticate('github', { session: false }));

    app.get('/auth/github/callback',
        passport.authenticate('github', { session: false }),
        (req: any, res) => {
            res.redirect(`http://localhost:54321/auth/${req.user.accessToken}`);
        });

    app.get("/todo", isAuth, async (req, res) => {
        const todos = await Todo.find({
            where: { creatorId: req.userId },
            order: { id: "DESC" },
        });

        res.send({ todos });
    });

    app.post("/todo", isAuth, async (req, res) => {
        const todo = await Todo.create({
            content: req.body.content,
            creatorId: req.userId,
        }).save();
        res.send({ todo });
    });

    app.put("/todo", isAuth, async (req, res) => {
        const todo = await Todo.findOne(req.body.id);
        if (!todo) {
            res.send({ success: false, message: "Todo not found" });
            return;
        }
        if (todo.creatorId !== req.userId) {
            res.status(403).send({ success: false, message: "Not authorized" });
            return;
        }
        todo.completed = !todo.completed;
        await todo.save();
        res.send({ todo });
    });

    app.delete("/todo",isAuth,async(req,res)=>{
        const todo = await Todo.findOne(req.body.id);
        if (!todo) {
            res.send({ success: false, message: "Todo not found" });
            return;
        }
        if (todo.creatorId !== req.userId) {
            res.status(403).send({ success: false, message: "Not authorized" });
            return;
        }
        await todo.remove();
        res.send({ success: true, message: "Todo deleted successfully" });
    });

    app.get('/me', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.send({ user: null });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.send({ user: null });
            return;
        }
        let userId = "";
        try {
            const payload: any = jwt.verify(token, process.env.JWT_SECRET);
            userId = payload.userId;
        } catch (error) {
            res.send({ user: null });
            return;
        }
        if (!userId) {
            res.send({ user: null });
            return;
        }
        const user = await User.findOne(userId);
        res.send({ user });

    });


    app.get("/", (_req, res) => {
        res.send("Hello");
    });
    app.listen(5001, () => {
        console.log("listening on 5001");
    });
};
main();