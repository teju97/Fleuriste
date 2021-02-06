//Require statements
const Koa = require('koa');
const Router = require('koa-router');
const handlebars = require("koa-handlebars");
const mysql = require('mysql');
const serve = require('koa-static');
const koaBody = require('koa-body');
var bcrypt = require('bcryptjs');
//Connection stuff
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : 'root123',
	database : 'Fleuriste'
});

connection.connect();

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

async function getUser(username){
	var results =  await query('select Fname from FLORIST where Username=?', [username]);
	return results[0].Fname;
}
async function checkFloristExists(username, pass){
	return query('select Password from FLORIST where Username=?', [username])
}

async function checkCustomerExists(id){
	return query('select * from CUSTOMER where Customer_ID=?', [id])
}

async function checkUsernameExists(user){
	return query('select * from FLORIST where Username=?', [user])
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
	await insert('insert into FLORIST values(?, ?, ?, ?, ?, ?)', [id, fname, lname, num, user, pwd])
}

async function insertCustomer(ctx, next){
	const { fname, lname, addr, phone } = ctx.request.body
	const results  = 
	await insert('insert into CUSTOMER(Customer_FName, Customer_LName, Address, Phone_No) values(?, ?, ?, ?)', [fname, lname, addr, phone])
	setCookie(ctx, next, 'custid', results.insertId);
}

async function insertItems(ctxBody, next){
	const { itemname, event, stock, price } = ctxBody
	const results  = 
	await insert('insert into ITEMS(Name, Stock, Price, Event) values(?, ?, ?, ?)', [itemname, stock, price, event])
	//console.log(results.insertId);
}

async function insertOrder(ctx, next){
	//Handling ORDERS table
	//Getting IDs based on username
	var username=ctx.cookies.get('usern', [true]);
	console.log(username);
	var results  = await query('select Florist_ID from FLORIST where Username=?', [username]);
	florid=results[0].Florist_ID;
	setCookie(ctx, next, 'florid', florid);
	custid=ctx.cookies.get('custid', [true]);
	//The info from user interface
	const { ordate, duedate } = ctx.request.body
	results  = 
	await insert('insert into ORDERS(Customer_ID, Florist_ID, Order_Date, Due_Date) values(?, ?, ?, ?)', [custid, florid, ordate, duedate])
	var ordid = results.insertId;
	console.log(ordid);
	console.log(ctx.request.body);
	setCookie(ctx, next, 'ordid', results.insertId);

	//Store date to display on invoice page
	setCookie(ctx, next, 'ordate', ordate);
	setCookie(ctx, next, 'duedate', duedate);
}

async function insertInvoice(ctx, next){
	//The info
	const { itemid, qty } = ctx.request.body
	var ordid=ctx.cookies.get('ordid', [true]);
	//Handling INVOICE table
	var result  = await query('select Price, Event from ITEMS where Item_ID=?', [itemid]);
	var price=result[0].Price;
	var event=result[0].Event;
	await insert('insert into INVOICE values(?, ?, ?, ?, ?)', [ordid, itemid, qty, price, event]);
}
async function getCurrentInvoice(ctx, next)
{
	return query('select * from INVOICE where Order_ID=?', [ctx.cookies.get('ordid', [true])]);
}

async function getStock(itemid){
	return query('select Stock from ITEMS where Item_ID=?', [itemid]);
}

async function getAmount(itemid, ordid){
	return query('select Price_Per_Item*Quantity as Amount from INVOICE where Item_ID=? and Order_ID=?', [itemid, ordid]);
}

async function getQuantity(itemid, ordid){
	return query('select Quantity from INVOICE where Item_ID=? and Order_ID=?', [itemid, ordid]);
}

async function delInvoice(ctx, next){
	var id = escapeInput(ctx.request.body.id+'');
	var ordid=ctx.cookies.get('ordid', [true]);
	console.log(ordid);
	const results= await query('delete from INVOICE where Item_ID=? and Order_ID=?', [id, ordid]);
	console.log(results.affectedRows)
	return results.affectedRows
}

async function getInvoice(ctx, next){
	var ordid=ctx.cookies.get('ordid', [true]);
	return query('select T.Item_ID, Name, Quantity, Price_Per_Item, Price_Per_Item*Quantity as Amount from INVOICE I, ITEMS T where Order_ID=? and I.Item_ID = T.Item_ID', [ordid]);
}

async function deleteItems(id, next){
	id = escapeInput(id+'');
	const results= await query('delete from ITEMS where Item_ID=?', [id]);
	console.log(results.affectedRows)
	return results.affectedRows
}

async function updateItems(queri, param, id){
	param = escapeInput(param+'');
	id = escapeInput(id+'');
	await query(queri, [param, id]);
}

async function callProc(ordid){
	return query('call Lucky(?)',[ordid]);
}


async function printTable(table){
	//console.log(table)
	return query('select * from ??', [table]);
}

function checkPwd(pwd, conpwd)
{
	return (pwd==conpwd);
}

function setCookie(ctx, next, field, value)
{
	ctx.cookies.set(field, value, ['session', true, Date.now()+8600000, , , true, true, true]);
}

module.exports = { query, getUser, checkFloristExists, checkUsernameExists, checkCustomerExists, insert, escapeInput, insertFlorist, insertCustomer, insertItems, insertOrder, deleteItems, updateItems, printTable, checkPwd, setCookie, callProc, insertInvoice, getInvoice, delInvoice, getStock, getCurrentInvoice, getQuantity, getAmount }