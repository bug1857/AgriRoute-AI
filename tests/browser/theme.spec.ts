import {test,expect} from '@playwright/test';

test('Farmer navigation and persistent dark theme preserve calculations, inputs and mobile layout',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/demo?lot=0');
 const toggle=page.getByRole('button',{name:'Dark theme',exact:true});
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await page.getByLabel('Market price change').fill('-10');
 const net=await page.getByTestId('net-value').textContent();
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.getByTestId('net-value')).toHaveText(net!);
 await expect(page.getByLabel('Market price change')).toHaveValue('-10');
 await page.reload();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'artifacts/browser/demo-dark.png'});
 await page.getByRole('link',{name:'Farmer',exact:true}).click();await expect(page).toHaveURL(/\/farmer$/);
 for(const path of ['/','/live','/mandi','/coordinator','/farmer']){
   await page.goto(path);await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
   expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(14, 27, 21)');
   await page.setViewportSize({width:390,height:844});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(page.getByRole('link',{name:'Farmer',exact:true})).toBeVisible();
 }
 await expect(page.getByRole('heading',{level:1})).toContainText('आपकी फसल');
 await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Farmer',exact:true})).toHaveAttribute('aria-current','page');
 await page.screenshot({path:'artifacts/browser/farmer-dark-mobile.png',fullPage:true});
 await toggle.click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.reload();await expect(toggle).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});
