const express = require("express");
const handlebars = require("express-handlebars");

const { Contenedor } = require("./contenedor");

const { options } = require('./mariaDB/conexionDB');
const { optionSqlite3 } = require('./sqlite3/conexionSqlite3');

const knex = require('knex')(options);
const knexSqlite3 = require('knex')(optionSqlite3);

const { Server: HttpServer } = require("http");
const { Server: IoServer } = require("socket.io");
const app = express();
const httpServer = new HttpServer(app);
const io = new IoServer(httpServer);

app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 8080;

const contenedor = new Contenedor(knex, "products");
const comentarios = new Contenedor(knexSqlite3, "messagges");

io.on("connection", async socket => {
	let mensajesChat = await comentarios.getAll();
	console.log("Se contectó un usuario");

	const mensaje = {
		mensaje: "ok",
		mensajesChat
	};

	socket.emit("mensaje-servidor", mensaje);

	socket.on("mensaje-nuevo", async (msg, cb) => {
		mensajesChat.push(msg);
		const mensaje = {
			mensaje: "mensaje nuevo",
			mensajesChat
		};

		const id = new Date().getTime();
		io.sockets.emit("mensaje-servidor", mensaje);
		cb(id);
		await comentarios.save({
			id,
			mail: msg.mail,
			mensaje: msg.mensaje,
			fecha: msg.hora
		});
	});
});

app.set("view engine", "hbs");
app.set("views", "./views/layouts");

app.use(express.static("public"));

app.engine(
	"hbs",
	handlebars.engine({
		extname: ".hbs",
		defaultLayout: "",
		layoutsDir: "",
		partialsDir: __dirname + "/views/partials"
	})
);

app.get("/", async (req, res) => {
	const producto = await contenedor.getAll();
	res.render("index", {
		list: producto,
		listExist: true,
		producto: true
	});
});

app.get("/", async (req, res) => {
	const producto = await contenedor.getAll();
	res.render("productos", {
		titulo: "Útiles escolares 2022",
		list: producto,
		listExist: true,
		producto: true
	});
});


app.post('/productos', async(req, res) => {
    const objProducto = req.body
    console.log(objProducto)
    const contenedor = new Contenedor('productos.json')
    let producto = await contenedor.save(objProducto)
    const listExist = true
    res.redirect('/');
} );

httpServer.listen(port, err => {
	if (err) throw new Error(`Error al iniciar el servidor: ${err}`);
	console.log(`Server is running on port ${port}`);
});