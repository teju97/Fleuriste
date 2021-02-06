const session = require('koa-session');
const Koa = require('koa');
const app = new Koa();

app.keys = ['some secret hurr'];

app.use(session(app));

app.use(ctx => {
  // ignore favicon
  if (ctx.path === '/favicon.ico') return;

  let n = ctx.session.views || 0;
  ctx.session.views = ++n;
  ctx.body = n + ' views';
  console.log(ctx.body);
  ctx.cookies.set(ctx.state.user = "bla")
  console.log(ctx.state);
});

app.listen(3000);
console.log('listening on port 3000');