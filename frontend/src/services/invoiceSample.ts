import { ImageAsset } from './imageLab';

export function sampleInvoice(amount: number, reference: string): ImageAsset {
  const canvas=document.createElement('canvas'); canvas.width=900; canvas.height=540;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,900,540);
  ctx.fillStyle='#20364b'; ctx.fillRect(0,0,900,95);
  ctx.fillStyle='#fff'; ctx.font='bold 30px sans-serif'; ctx.fillText('FLOURCO / SUPPLIER INVOICE',40,60);
  ctx.fillStyle='#56798b'; ctx.font='18px sans-serif'; ctx.fillText('DEMONSTRATION DOCUMENT — NOT A REAL INVOICE',40,138);
  ctx.fillStyle='#20364b'; ctx.font='24px sans-serif'; ctx.fillText(`Invoice: ${reference}`,40,200);
  ctx.font='20px sans-serif'; ctx.fillText('Bill to: Alice’s Bakery',40,245); ctx.fillText('Supplier: Rahul / FlourCo',40,280);
  ctx.fillStyle='#eef5f7'; ctx.fillRect(40,325,820,105);
  ctx.fillStyle='#456b80'; ctx.font='16px sans-serif'; ctx.fillText('TOTAL AMOUNT / INR',60,360);
  ctx.fillStyle='#20364b'; ctx.font='bold 34px sans-serif'; ctx.fillText((amount/100).toFixed(2),60,407);
  ctx.fillStyle='#8b9daa'; ctx.font='16px sans-serif'; ctx.fillText('Demo beneficiary: rahul@demo  ·  No real payment requested',40,485);
  return {data:canvas.toDataURL('image/png'),name:`${reference}.png`,width:900,height:540};
}
