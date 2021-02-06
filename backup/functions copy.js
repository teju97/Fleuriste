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

async function insertDeco(ctxBody, next){
	const { deconame, details, decostock, decoavai, decoprice, decoevent } = ctxBody
	const results  = 
	await insert('insert into DECORATIONS(Name, Details, Availability, Stock, Price, Event) values(?, ?, ?, ?, ?, ?)', [deconame, details, decoavai, decostock, decoprice, decoevent])
	//console.log(results.insertId);
}

async function insertOrder(ctx, next){
	var username=ctx.cookies.get('usern', [true]);
	var results  = await query('select Florist_ID from FLORIST where Username=?', [username]);
	florid=results[0].Florist_ID;
	setCookie(ctx, next, 'florid', florid);
	custid=ctx.cookies.get('custid', [true]);
	const { ordate, duedate } = ctx.request.body
	results  = 
	await insert('insert into ORDERS(Customer_ID, Florist_ID, Order_Date, Due_Date) values(?, ?, ?, ?)', [custid, florid, ordate, duedate])
	var ordid = results.insertId;
	console.log(ordid);
	console.log(ctx.request.body);
}

async function insertArran(ctxBody, next){
	const { arrname, arrevent, arrprice, decoid, decoqty } = ctxBody
	const results  = 
	await insert('insert into ARRANGEMENT(Name, Event, Price, Decoration_ID, Quantity) values(?, ?, ?, ?, ?)', [arrname, arrevent, arrprice, decoid, decoqty])
}

async function deleteArran(ctxBody, next){
	const { arrid } = ctxBody;
	const results= await query('delete from ARRANGEMENT where Arrangement_ID=?', [arrid]);
	console.log(results.affectedRows)
	return results.affectedRows
}

async function updateArran(ctxBody, next){
	const { id, arrname, arrevent, arrprice, decoid, decoqty } = ctxBody
	console.log(ctxBody)
	const results  = 
	await insert('update ARRANGEMENT set Name=? and Event=? and Price=? and Decoration_ID=? and Quantity=? where Arrangement_ID=?', [arrname, arrevent, arrprice, decoid, decoqty, id])
	return results.affectedRows
}

async function callProc(ctx, next){
	var username=ctx.cookies.get('usern', [true]);
	var results  = await query('select Florist_ID from FLORIST where Username=?', [username]);
	var florid=results[0].Florist_ID;
	return query('call GetCustomer(florid)');
}


async function printTable(table){
	console.log(table)
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

module.exports = { query, getUser, checkFloristExists, checkCustomerExists, insert, escapeInput, insertFlorist, insertCustomer, insertDeco, insertOrder, insertArran, deleteArran,updateArran, printTable, checkPwd, setCookie, callProc }