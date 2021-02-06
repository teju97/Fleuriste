//Require statements
const Koa = require('koa');
const Router = require('koa-router');
const handlebars = require("koa-handlebars");
const mysql = require('mysql');
const serve = require('koa-static');
const koaBody = require('koa-body');
var bcrypt = require('bcryptjs');

var { query, getUser, checkFloristExists, checkCustomerExists, checkUsernameExists, insert, escapeInput, insertFlorist, insertCustomer, insertItems, insertOrder, insertArran, deleteItems, printTable, updateItems,checkPwd, setCookie, callProc, insertInvoice, getInvoice, delInvoice, checkStock, getStock, getCurrentInvoice, getQuantity, getAmount }
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
	//console.log(ctx.cookies.get('mssg', [true]));
	await ctx.render("login", {
		title: "Fleuriste - Login Page",
		message: ctx.cookies.get('mssg', [true])
	});
	//console.log(ctx.cookies.get('mssg', [true]));
});

router.post('/', async function (ctx, next) {
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
				ctx.redirect('/');
			}
		}
		else
		{
			console.log("User does not exist")
			msg="User does not exist";
			setCookie(ctx, next, 'mssg', msg);
			ctx.redirect('/');
		}
	}
	catch(err)
	{
		msg=err;
		setCookie(ctx, 'mssg', err);
	}
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
	if (!pwdSame){
		msg="Passwords don't match.";
	}
	else {
		ctx.request.body.pwd = bcrypt.hashSync(ctx.request.body.pwd, 2);
		//check if username already exists
		var results = await checkUsernameExists(ctx.request.body.user);
		if(results.length>0)
		{
			console.log("Username Exists.")
			msg="Username Already Exists.";
		}
		else {
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
			}
		}
	}
	await ctx.render("signup", {
		title: "Fleuriste - SignUp Page",
		message: msg
	});
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
		//console.log(results);
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
		//console.log("before rendering")
		await ctx.render("customer", {
			title: "Fleuriste - Order Page",
			message: msg
		});
		//console.log("after rendering")
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
	var results = await printTable('ITEMS')
	await ctx.render("order", {
		title: "Fleuriste - Order Page",
		results: results
	});
});

router.post('/order', async function (ctx, next) {
	var msg;
	if(ctx.request.body.ordate<ctx.request.body.duedate)
	{
		try {
			await insertOrder(ctx, next);
			ctx.redirect('/invoice');
		}
		catch(err)
		{
			console.log(err)
			msg=err;
		}
	}
	else
		msg="Enter Valid Due Date.";
	await ctx.render("order", {
		title: "Fleuriste - Order Page",
		message: msg
	});
});

//router rendering
//Invoice page
router.get('/invoice', async function (ctx, next) {
	var result = await getInvoice(ctx, next);
	console.log(result);
	await ctx.render("invoice", {
		title: "Fleuriste - Invoice Page",
		result: result,
		ordate: ctx.cookies.get('ordate', [true]),
		duedate: ctx.cookies.get('duedate', [true])
	});
});

router.post('/invoice', async function (ctx, next) {
	var msg;
	var result = await getInvoice(ctx, next);
	if(ctx.request.body.id)
	{
		const affected = await delInvoice(ctx, next)
		if(affected==0)
		{
			msg="This Item ID does not exist";
		}
		else
			ctx.redirect('/invoice');
	}
	else if(ctx.request.body.itemid && ctx.request.body.qty)
	{
		try {
			var result = await getStock(ctx.request.body.itemid);
			console.log(result);
			if (ctx.request.body.qty<=result[0].Stock)
			{
				await insertInvoice(ctx, next);
				ctx.redirect('/invoice');
			}
			else
				msg="Not enough stock!";
		}
		catch(err)
		{
			console.log(err)
			msg=err;
		}
	}
	await ctx.render("invoice", {
		title: "Fleuriste - Invoice Page",
		result: result,
		ordate: ctx.cookies.get('ordate', [true]),
		duedate: ctx.cookies.get('duedate', [true]),
		message: msg
	});
	if(ctx.request.body.confirm)
	{
		var results = await getCurrentInvoice(ctx, next);
		var amount=0;
		for(var i=0; i<results.length; i++)
		{
			var itemid = results[i].Item_ID;
			var stock = await getStock(itemid);
			var qty = await getQuantity(itemid, ctx.cookies.get('ordid', [true]) )
			console.log(stock);
			console.log(qty);
			console.log(stock[0].Stock);
			var fstock= stock[0].Stock-qty[0].Quantity;
			console.log(fstock);
			var query='update ITEMS set Stock=? where Item_ID= ?'
			await updateItems(query, fstock, itemid);
			var price = await getAmount(itemid, ctx.cookies.get('ordid', [true]) );
			amount+=price[0].Amount;
		}
		var mess = await callProc(ctx.cookies.get('ordid', [true]));
		var temp;
		console.log(mess);
		if(mess[0])
			{//console.log(mess[0][0].message);
				temp=mess[0][0].message;}
				await ctx.render("invoice", {
					title: "Fleuriste - Invoice Page",
					result: result,
					ordate: ctx.cookies.get('ordate', [true]),
					duedate: ctx.cookies.get('duedate', [true]),
					label: 'Total Amount:',
					amount: amount,
					luck: temp
				});
			}
		});

//router rendering
//Add Items page
router.get('/items', async function (ctx, next) {
	var results = await printTable('ITEMS')
	console.log(results)
	await ctx.render("items", {
		title: "Fleuriste - Add Page",
		results: results

	});
});

router.post('/items', async function (ctx, next) {
	var msg;
	try {
		await insertItems(ctx.request.body, next);
		ctx.redirect('/items');
	}
	catch(err)
	{
		console.log(err)
		msg=err;
	}
	await ctx.render("items", {
		title: "Fleuriste - Order Page",
		message: msg
	});
});

//router rendering
//Update Item page
router.get('/upitems', async function (ctx, next) {
	var results = await printTable('ITEMS')
	await ctx.render("upitems", {
		title: "Fleuriste - Update Page",
		results: results
	});
});

router.post('/upitems', async function (ctx, next) {
	var msg, query;
	if(!ctx.request.body.itemname && !ctx.request.body.event && !ctx.request.body.stock && !ctx.request.body.price)
		msg="Please enter the details to be updated!";
	else
	{
		if (ctx.request.body.itemname)
		{
			query='update ITEMS set Name=? where Item_ID= ?'
			updateItems(query, ctx.request.body.itemname, ctx.request.body.itemid);
		}
		if (ctx.request.body.event)
		{
			query='update ITEMS set Event=? where Item_ID= ?'
			updateItems(query, ctx.request.body.event, ctx.request.body.itemid);
		}
		if (ctx.request.body.stock)
		{
			query='update ITEMS set Stock=? where Item_ID= ?'
			updateItems(query, ctx.request.body.stock, ctx.request.body.itemid);
		}
		if (ctx.request.body.price)
		{
			query='update ITEMS set Price=? where Item_ID= ?'
			updateItems(query, ctx.request.body.price, ctx.request.body.itemid);
		}
		var result = await printTable('ITEMS')
		await ctx.render("upitems", {
			title: "Fleuriste - Update Page",
			results: result,
			message: msg
		});
	}
});

//router rendering
//Delete Items page
router.get('/delitems', async function (ctx, next) {
	var results = await printTable('ITEMS')
	await ctx.render("delitems", {
		title: "Fleuriste - Delete Page",
		results: results,
	});
});

router.post('/delitems', async function (ctx, next) {
	var msg="";
	try {
		const affected = await deleteItems(ctx.request.body.id, next);
		if(affected==0)
		{
			msg="This Item ID does not exist";
			var results = await printTable('ITEMS')
			await ctx.render("delitems", {
				title: "Fleuriste - Delete Page",
				results: results,
				message: msg
			});
		}
		else
			ctx.redirect('/delitems');
	}
	catch(err)
	{
		console.log(err)
		msg=err;
	}
});

app.listen(3000);
