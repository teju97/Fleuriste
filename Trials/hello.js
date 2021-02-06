//Require statements
const Koa = require('koa');
var Router = require('koa-router');
const handlebars = require("koa-handlebars");
var mysql = require('mysql');
const serve = require('koa-static');
const koaBody = require('koa-body');
var bcrypt = require('bcryptjs');

//Instantiation
const app = new Koa();
var router = new Router();

//Connection stuff
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : 'root123',
	database : 'Fleuriste'
});

connection.connect();

//just like that
connection.query('SELECT * FROM CUSTOMER', function (error, results, fields) {
	if (error) throw error;
	console.log('The solution is: ', results[0].Customer_ID);
});

//usé
app
.use(router.routes())
.use(router.allowedMethods());

router.use(handlebars({
	defaultLayout: "layout", 
	cache: false
}));

app.use(serve('.'));
app.use(serve(__dirname + '/public'));

router.use(koaBody());

//router rendering
//login page
router.get('/', async function (ctx, next) {
	await ctx.render("login", {
		title: "Fleuriste - Login Page",
	});
});

router.post('/', async function (ctx, next) {
	var msg;
	const { user, pwd } = ctx.request.body;
	var username = escapeInput(user);
	var pass = escapeInput(pwd);
	console.log(username, pass)
	var results = await checkFloristExists(username, pass);
	try{
		if(results.length>0)
		{
			if(bcrypt.compareSync(pass, results[0].Password))
				ctx.redirect('/welcome');
			else
			{
				console.log("Wrong Password")
				msg="Wrong Password";
			}
		}
		else
		{
			console.log("User does not exist")
			msg="User does not exist";
		}
	}
	catch(err)
	{
		msg=err;
	}
	await ctx.render("login", {
		title: "Fleuriste - Login Page",
		message: msg});
});

//signup page
router.get('/signup', async function (ctx, next) {
	await ctx.render("signup", {
		title: "Fleuriste - SignUp Page",
	});

});

router.post('/signup', async function (ctx, next) {
	var msg;
	//check passwords same
	var pwdSame = checkPwd(ctx.request.body.pwd, ctx.request.body.conpwd)
	if (!pwdSame)
		msg="Passwords don't match.";
	else
		ctx.request.body.pwd = bcrypt.hashSync(ctx.request.body.pwd, 2);

	//check duplicate ID
	try {
		await insertFlorist(ctx.request.body, next);
		ctx.redirect('/welcome');
	} catch(err) {
		switch(err.code) {
			case 'ER_DUP_ENTRY':
			console.log('ID Already Exists.')
			msg="Duplicate ID. Already Exists.";
			break;
			default:
			console.log('Raendom Error.')
			msg="Error.";
			break;
		}
		await ctx.render("signup", {
			title: "Fleuriste - SignUp Page",
			message: err});
	}
});

function query(mysqlQuery, params) {
	return new Promise((resolve, reject) => {
		connection.query(mysqlQuery, params, function (error, results, fields) {
			if (error) {
				reject(error)
			}
			resolve(results)
		});
	})
}

async function checkFloristExists(username, pass){
	return query('select Password from FLORIST where Username=?', [username])
}

function insert(mysqlQuery, params) {
	const escapedParams = 
	params.map((param) => connection.escape(param).replace(/'/g,""))

	return query(mysqlQuery, escapedParams)
}

function escapeInput(input) {
	return mysql.escape(input).replace(/'/g,"")
}

async function insertFlorist(ctxBody, next){
	const { id, fname, lname, num, user, pwd, conpwd } = ctxBody
	const results  = 
	await insert('insert into FLORIST values(?, ?, ?, ?, ?, ?)', [id, fname, lname, user, pwd, num])
}

function checkPwd(pwd, conpwd)
{
	return (pwd==conpwd);
}

app.listen(3000);
