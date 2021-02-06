//Require statements
const Koa = require('koa');
const Router = require('koa-router');
const handlebars = require("koa-handlebars");
const mysql = require('mysql');
const serve = require('koa-static');
const koaBody = require('koa-body');
var bcrypt = require('bcryptjs');

var { query, getUser, checkFloristExists, checkCustomerExists, insert, escapeInput, insertFlorist, insertCustomer, insertDeco, insertOrder, insertArran, deleteArran, printTable,updateArran,checkPwd, setCookie, callProc }
= require('./functions.js');

//Instantiation
const app = new Koa();
var router = new Router();

//just like that
//connection.query('SELECT * FROM CUSTOMER', function (error, results, fields) {
	//if (error) throw error;
	//console.log('The solution is: ', results[0].Customer_ID);
//});

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
	setCookie(ctx, next, 'usern', null);
	setCookie(ctx, next, 'mssg', null);
	setCookie(ctx, next, 'custid', null);
	console.log(ctx.cookies.get('mssg', [true]));
	await ctx.render("login", {
		title: "Fleuriste - Login Page",
		message: ctx.cookies.get('mssg', [true])
	});
	console.log(ctx.cookies.get('mssg', [true]));
});

router.post('/', async function (ctx, next) {
	setCookie(ctx, next, 'usern', null);
	setCookie(ctx, next, 'mssg', null);
	//fetch enetered values
	const { user, pwd } = ctx.request.body;
	var username = escapeInput(user);
	var pass = escapeInput(pwd);
	///console.log(ctx.request.body.user+"USER");
	//set username in cookieee
	setCookie(ctx, next, 'usern', ctx.request.body.user);
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
				setCookie(ctx, next, 'mssg', msg);
			}
		}
		else
		{
			console.log("User does not exist")
			msg="User does not exist";
			setCookie(ctx, next, 'mssg', msg);
		}
	}
	catch(err)
	{
		msg=err;
		setCookie(ctx, 'mssg', err);
	}
	await ctx.render("login", {
		title: "Fleuriste - Login Page",
		message: ctx.cookies.get('mssg', [true])
	});
});

//router rendering
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
		setCookie(ctx, next, 'usern', ctx.request.body.user);
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
			msg=err;
			break;
		}
		await ctx.render("signup", {
			title: "Fleuriste - SignUp Page",
			message: msg
		});
	}
});

//router rendering
//welcome page
router.get('/welcome', async function (ctx, next) {
	var username=ctx.cookies.get('usern', [true]);
	var user = await getUser(username);
	await ctx.render("welcome", {
		title: "Fleuriste - Welcome Page",
		name: user
	});

});

router.post('/welcome', async function (ctx, next) {
	if(ctx.request.body.logo)
	{
		var msg = "Successfully logged out."
		setCookie(ctx, next, 'mssg', msg);
		console.log(ctx.cookies.get('mssg', [true]));
		ctx.redirect('/');
	}
});

//router rendering
//Customer page
router.get('/customer', async function (ctx, next) {
	await ctx.render("customer", {
		title: "Fleuriste - Order Page",
	});

});

router.post('/customer', async function (ctx, next) {
	var msg;
	if(ctx.request.body.id)
	{
		var id = escapeInput(ctx.request.body.id);
		var results = await checkCustomerExists(id);
		console.log(results);
		if(results.length>0)
		{
			setCookie(ctx, next, 'custid', id);
			ctx.redirect('/order');
		}
		else
		{
			console.log("Customer does not exist")
			msg="Customer does not exist";
		}
		console.log("before rendering")
		await ctx.render("customer", {
			title: "Fleuriste - Order Page",
			message: msg
		});
		console.log("after rendering")
	}
	else if (ctx.request.body.fname && ctx.request.body.phone)
	{
		try {
			var p= await insertCustomer(ctx, next);
			ctx.redirect('/order');
		}
		catch(err)
		{
			console.log(err);
			msg=err;
		}
		await ctx.render("customer", {
			title: "Fleuriste - Order Page",
			message: msg
		});

	}
	else
	{
		var msg = "No input entered."
		await ctx.render("customer", {
			title: "Fleuriste - Order Page",
			message: msg
		});
	}
});


//router rendering
//Order page
router.get('/order', async function (ctx, next) {
	var results = await printTable('DECORATIONS')
	var arrange = await printTable('ARRANGEMENT')
	await ctx.render("order", {
		title: "Fleuriste - Order Page",
		results: results,
		arrange: arrange
	});
});

router.post('/order', async function (ctx, next) {
	var msg;
	try {
		var op = await insertOrder(ctx, next);
		ctx.redirect('/order');
	}
	catch(err)
	{
		console.log(err)
		msg=err;
	}
	await ctx.render("order", {
		title: "Fleuriste - Order Page",
		message: msg
	});
});


//router rendering
//Arrangements page
router.get('/arran', async function (ctx, next) {
	var results = await printTable('ARRANGEMENT')
	await ctx.render("arran", {
		title: "Fleuriste - Add Page",
		results: results
	});

});

router.post('/arran', async function (ctx, next) {
	var msg;
	try {
		await insertArran(ctx.request.body, next);
		ctx.redirect('/arran');
	}
	catch(err)
	{
		switch(err.code) {
			case 'ER_NO_REFERENCED_ROW_2':
			console.log('This Decoration ID deos not exist.')
			msg="This Decoration ID deos not exist.";
			break;
			default:
			console.log('Raendom Error.')
			msg=err;
			break;
		}
		await ctx.render("arran", {
			title: "Fleuriste - Order Page",
			message: msg
		});
	}
});

//router rendering
//Update Arrangement page
router.get('/uparran', async function (ctx, next) {
	var results = await printTable('ARRANGEMENT')
	await ctx.render("uparran", {
		title: "Fleuriste - Update Page",
		results: results
	});
});

router.post('/uparran', async function (ctx, next) {
	var msg;
	if(ctx.request.body.arrid)
	{
		try {
			var results = await deleteArran(ctx.request.body, next);
			console.log(results)
			if (results==0)
			{
				msg="This Arrangement ID deos not exist.";
				await ctx.render("uparran", {
					title: "Fleuriste - Update Page",
					message: msg
				});
			}
			else
				ctx.redirect('/uparran');
		}
		catch(err)
		{
			console.log(err)
			msg=err;
		}
		await ctx.render("uparran", {
			title: "Fleuriste - Update Page",
			message: msg
		});
	}
	else if(ctx.request.body.id)
	{
		try {
			var result = await updateArran(ctx.request.body, next);
			if (results==0)
			{
				msg="This Arrangement ID deos not exist.";
				await ctx.render("uparran", {
					title: "Fleuriste - Update Page",
					message: msg
				});
			}
			else
				ctx.redirect('/uparran');
		}
		catch(err)
		{
			console.log(err)
			msg=err;
		}
		await ctx.render("uparran", {
			title: "Fleuriste - Update Page",
			message: msg
		});
	}
});

//router rendering
//Decoration page
router.get('/deco', async function (ctx, next) {
	var results = await printTable('DECORATIONS')
	console.log(results)
	await ctx.render("deco", {
		title: "Fleuriste - Add Page",
		results: results

	});
});

router.post('/deco', async function (ctx, next) {
	var msg;
	try {
		await insertDeco(ctx.request.body, next);
		ctx.redirect('/deco');
	}
	catch(err)
	{
		console.log(err)
		msg=err;
	}
	await ctx.render("deco", {
		title: "Fleuriste - Order Page",
		message: msg
	});
});

//router rendering
//Update Decoration page
router.get('/updeco', async function (ctx, next) {
	var results = await printTable('DECORATIONS')
	await ctx.render("updeco", {
		title: "Fleuriste - Add Page",
		results: results
	});
});

router.post('/updeco', async function (ctx, next) {
	var msg;
	try {
		await updateDeco(ctx.request.body, next);
		ctx.redirect('/updeco');
	}
	catch(err)
	{
		console.log(err)
		msg=err;
	}
	await ctx.render("updeco", {
		title: "Fleuriste - Order Page",
		message: msg
	});
});

//router rendering
//Update Decoration page
router.get('/yourcust', async function (ctx, next) {
	var results = await callProc(ctx, next);
	await ctx.render("yourcust", {
		title: "Fleuriste - Add Page",
		results: results
	});
});

app.listen(3000);
