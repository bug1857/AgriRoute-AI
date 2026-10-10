import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,appendFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {migrate,database} from '../lib/database';
import {passwordHash} from '../lib/coordinator';
async function main(){
 if(!process.env.DATABASE_URL){await mkdir('private',{recursive:true,mode:0o700});const password=randomBytes(32).toString('hex'),passwordFile=process.cwd()+'/private/postgres.password';await writeFile(passwordFile,password,{mode:0o600});const dir=process.cwd()+'/private/postgres';let initialized=true;try{await access(dir+'/PG_VERSION');}catch{initialized=false;}if(initialized)throw new Error('Existing local cluster: configure its DATABASE_URL explicitly; no overwrite');
 execFileSync('/opt/homebrew/bin/initdb',['-D',dir,'-U','agriroute','--auth-local=trust','--auth-host=scram-sha-256','--pwfile='+passwordFile],{stdio:'pipe'});
 execFileSync('/opt/homebrew/bin/pg_ctl',['-D',dir,'-l',process.cwd()+'/private/postgres.log','-o','-h 127.0.0.1 -p 55432','start'],{stdio:'pipe'});
 execFileSync('/opt/homebrew/bin/createdb',['-h','127.0.0.1','-p','55432','-U','agriroute','agriroute'],{stdio:'pipe',env:{...process.env,PGPASSWORD:password}});
 process.env.DATABASE_URL=`postgresql://agriroute:${password}@127.0.0.1:55432/agriroute`;const env=await readFile('.env.local','utf8');if(/^DATABASE_URL=/m.test(env))throw new Error('DATABASE_URL already present; configure without overwrite');await appendFile('.env.local',`\nDATABASE_URL=${process.env.DATABASE_URL}\nAPP_ORIGIN=http://127.0.0.1:3010\n`,{mode:0o600});
 }
 await migrate();const existing=(await database().query('SELECT id FROM ar_users LIMIT 1')).rows[0];if(!existing){const tenant=randomUUID();await database().query('INSERT INTO ar_tenants(id,name) VALUES($1,$2)',[tenant,'Local demonstration FPO']);const accounts=[];for(const role of ['coordinator','farmer']){const password=randomBytes(18).toString('base64url'),email=`${role}@agriroute.local`;await database().query('INSERT INTO ar_users(id,tenant_id,id_email,name,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),tenant,email,`Local ${role}`,role,passwordHash(password)]);accounts.push({email,password,role});}await writeFile('private/local-accounts.json',JSON.stringify({scope:'Local database accounts only. Do not publish. Cloud credentials not configured.',accounts},null,2),{mode:0o600});}
 console.log('PASS: PostgreSQL schema provisioned. Local sign-in credentials are in ignored private/local-accounts.json; no credentials printed. Hosted database remains unconfigured.');await database().end();
}
void main().catch(()=>{console.error('Database setup failed. Inspect local PostgreSQL log; credentials withheld.');process.exitCode=1;});
