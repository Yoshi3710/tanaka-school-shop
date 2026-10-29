
'use strict';
const PRODUCTS=[
{id:'288587',sku:'SDZ-EX',name:'ポスターカラーデザインセット（25cm）',description:'ポスターカラーEX 12色13本（白2本）・デザイン筆3本・25cm定規・金属棒・小型雑巾',price:3311,tag:'基本セット',image:'https://www.craypas.co.jp/assets/product/288587.jpg',url:'https://www.craypas.co.jp/products/painting-school/019/0068/288587.html'},
{id:'217701',sku:'SDZ-EX3PB',name:'ポスターカラーデザインセット 三原色入り（25cm）',description:'三原色入り・ポスターカラーEX 12色13本（白2本）・筆・25cm定規などの画材セット',price:3311,tag:'三原色タイプ',image:'https://www.craypas.co.jp/assets/product/217701.jpg',url:'https://www.craypas.co.jp/products/painting-school/019/0068/217701.html'},
{id:'288617',sku:'SDZ-WXN',name:'ポスターカラーデザインセット（30cm）',description:'30cm定規入り・大きめのデザインケースW・ポスターカラーEX 12色13本・筆など',price:3432,tag:'30cmタイプ',image:'https://www.craypas.co.jp/assets/product/288617.jpg',url:'https://www.craypas.co.jp/products/painting-school/019/0068/288617.html'}
];
const fmt=n=>Number(n).toLocaleString('ja-JP')+'円';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const qty=n=>Math.max(0,Math.min(9999,Math.floor(Number(n)||0)));
const cart={};
const lineBreak=s=>String(s??'').replace(/\r\n/g,'\n');
const productById=id=>PRODUCTS.find(p=>p.id===id);
const classAllocations={}; // 商品別に学年・組と注文数量を保存
let editingProductId='';
let reviewData=null;
let lastQuoteReference=null;
// 正式受付を行わない試作版の番号。正式な見積番号・注文番号と区別する。
function makeDraftNumber(requestType){
 const day=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10).replace(/-/g,'');
 const bytes=new Uint8Array(5);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
 else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 return (requestType==='見積依頼'?'Q':'O')+'-'+day+'-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
const docName=d=>d.requestType==='見積依頼'?'お見積り内容':'ご注文内容';
const docFacts=d=>[
 [d.requestType==='見積依頼'?'見積番号（仮）':'注文番号（仮）',d.documentNumber],
 [d.requestType==='見積依頼'?'見積作成日':'注文日',d.requestType==='見積依頼'?d.created:'未確定（正式受付前）'],
 ...(d.quoteReference?[['元の見積番号（仮）',d.quoteReference]]:[])
];
let toastTimer;
function samplePhoto(){return 'assets/design-set-sample.webp'}
function flash(msg){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),2600)}
function totalCount(){return Object.values(cart).reduce((s,n)=>s+n,0)}
function totalPrice(){return PRODUCTS.reduce((s,p)=>s+(cart[p.id]||0)*p.price,0)}
function setCart(id,num,silent=false){cart[id]=qty(num);if(!silent){renderCart();flash(cart[id]?'ご注文内容を更新しました':'数量を0にしました')}else renderCart()}
let activeCategory="all";
function renderProducts(){const q=$('searchProduct').value.trim().toLowerCase();const found=PRODUCTS.filter(p=>[p.name,p.sku,p.id,'サクラクレパス',p.description].join(' ').toLowerCase().includes(q)&& (activeCategory==='all'||(activeCategory==='25cm'&&p.id==='288587')||(activeCategory==='three'&&p.id==='217701')||(activeCategory==='30cm'&&p.id==='288617')));$('productGrid').innerHTML=found.map((p,i)=>`<article class="product"><div class="product-img"><span class="product-badge ${i?'alt':''}">${esc(p.tag)}</span><img src="${samplePhoto()}" alt="" aria-hidden="true"><img class="photo-real" loading="lazy" src="${p.image}" alt="${esc(p.name)}の商品写真" onload="this.style.opacity=1"></div><div class="prod-body"><div class="prod-maker">サクラクレパス　品番 ${p.id} ／ ${esc(p.sku)}</div><h3 class="prod-title">${esc(p.name)}</h3><p class="prod-desc">${esc(p.description)}</p><div class="prod-bottom"><div class="prod-price">${fmt(p.price)}<small>税込</small></div><p class="price-note">メーカー参考価格・タナカ販売価格は別途ご案内</p><div class="prod-action"><a class="btn btn-secondary" href="products/design-set.html#item-${p.id}">商品詳細</a><button class="btn btn-primary" type="button" data-detail="${p.id}">ご注文</button></div><a class="prod-link" href="${p.url}" target="_blank" rel="noopener noreferrer">メーカーの商品詳細を見る ↗</a></div></div></article>`).join('');$('noResults').style.display=found.length?'none':'block'}
function renderCart(){$('cartBadge').textContent=totalCount();const items=PRODUCTS.filter(p=>cart[p.id]>0);$('orderLines').innerHTML=items.length?items.map(p=>`<div class="cartline"><img src="${samplePhoto()}" alt=""><div><div class="cartname">${esc(p.name)}</div><div class="cartcode">品番 ${p.id} ｜ 参考単価 ${fmt(p.price)}</div><div class="alloc-state ${classAllocations[p.id]&&classAllocations[p.id].total===cart[p.id]?'':'warning'}">${classAllocations[p.id]&&classAllocations[p.id].total===cart[p.id]?'✓ 学年・組別の明細が登録済み':'学年・組の内訳が未登録／数量不一致'}</div>${classAllocations[p.id]&&classAllocations[p.id].total===cart[p.id]?`<div class="cart-alloc-list">${classAllocations[p.id].rows.map(r=>`<span class="cart-alloc-pill">${esc(r.grade)}${esc(r.classNo)} <b>${r.count}個</b></span>`).join('')}${classAllocations[p.id].spare?`<span class="cart-alloc-pill">予備・別梱包 <b>${classAllocations[p.id].spare}個</b></span>`:''}</div>`:''}<button class="inline-link" type="button" data-editclass="${p.id}">クラス別明細を編集</button>　<button class="inline-link" type="button" data-remove="${p.id}">削除</button></div><div class="stepper" aria-label="${esc(p.name)}の数量"><button type="button" data-minus="${p.id}" aria-label="数量を1減らす">−</button><input type="number" min="0" max="9999" inputmode="numeric" aria-label="注文数量" value="${cart[p.id]}" data-qty="${p.id}"><button type="button" data-plus="${p.id}" aria-label="数量を1増やす">＋</button></div></div>`).join(''):'<div class="emptycart"><strong>まだ教材が選ばれていません</strong>上の商品から必要な教材を追加してください。</div>';$('cartCalc').classList.toggle('noshow',!items.length);$('cartAmount').textContent=fmt(totalPrice())}
const YEAR_OPTIONS=['1年','2年','3年','その他'];
const CLASS_OPTIONS=Array.from({length:15},(_,i)=>(i+1)+'組').concat(['特別支援','その他']);
function initialRows(){return [{grade:'1年',classNo:'1組',count:''},{grade:'1年',classNo:'2組',count:''}];}
let classRows=initialRows();
function renderClasses(){
 const container=$('classRows'); container.innerHTML='';
 for(let i=0;i<classRows.length;i++){
  const r=classRows[i],div=document.createElement('div');div.className='class-row';
  const opts=(vals,sel)=>'<option value="">選択</option>'+vals.map(v=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(v)}</option>`).join('');
  div.innerHTML=`<select class="field" aria-label="${i+1}行目の学年" data-rowgrade="${i}" required>${opts(YEAR_OPTIONS,r.grade)}</select><select class="field" aria-label="${i+1}行目の組" data-rowclass="${i}" required>${opts(CLASS_OPTIONS,r.classNo)}</select><input class="field" type="number" inputmode="numeric" aria-label="${i+1}行目の数量" min="0" max="9999" data-rowcount="${i}" value="${esc(r.count)}" placeholder="個"><button class="tiny-delete" type="button" data-rowdel="${i}" aria-label="${i+1}行目を削除" ${classRows.length<=1?'disabled':''}>×</button>`;
  container.appendChild(div);
 }
 calcClass();
}
function calcClass(){const persons=classRows.reduce((s,r)=>s+qty(r.count),0);const total=persons+qty($('spareCount').value);$('classTotal').textContent=total.toLocaleString('ja-JP')+' 個';return total}
function loadClassProduct(id){
 editingProductId=id;
 const d=classAllocations[id];
 classRows=d?d.rows.map(r=>({grade:r.grade,classNo:r.classNo,count:r.count})):initialRows();
 $('spareCount').value=d?d.spare:0;
 renderClasses();
}

function scrollToOrder(){$('order').scrollIntoView({behavior:'smooth',block:'start'})}
function formValue(id){return $(id).value.trim()}
function selectedRadio(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||''}
function getData(){
 const lines=PRODUCTS.filter(p=>(cart[p.id]||0)>0).map(p=>({id:p.id,name:p.name,sku:p.sku,price:p.price,quantity:cart[p.id]}));
 const allocations=lines.map(p=>classAllocations[p.id]).filter(a=>a && cart[a.productId]===a.total).map(a=>({productId:a.productId,productName:a.productName,rows:a.rows.map(r=>({...r})),spare:a.spare,total:a.total}));
 // 同一商品であっても、学年・組ごとに独立した明細行として出力する
 const detailLines=[];
 for (const p of lines){
   const a=allocations.find(x=>x.productId===p.id);
   if(!a) continue;
   for(const r of a.rows) detailLines.push({id:p.id,sku:p.sku,name:p.name,grade:r.grade,classNo:r.classNo,quantity:r.count,price:p.price,amount:r.count*p.price,spare:false});
   if(a.spare) detailLines.push({id:p.id,sku:p.sku,name:p.name,grade:'予備',classNo:'別梱包',quantity:a.spare,price:p.price,amount:a.spare*p.price,spare:true});
 }
 return {requestType:selectedRadio('requestType'),school:formValue('schoolName'),teacher:formValue('teacherName'),phone:formValue('phone'),email:formValue('email'),city:formValue('city'),address:formValue('address'),date:formValue('deliveryDate'),sales:formValue('salesName'),payment:selectedRadio('requestType')==='見積依頼'?'見積依頼のため未指定':selectedRadio('payment'),notes:formValue('notes'),lines,detailLines,amount:totalPrice(),allocations,created:new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})};
}

function rowKV(k,v,wide=false){return (!v||!String(v).trim())?'':`<div class="review-item${wide?' wide':''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;}
// 商品・学年・組・数量が同一行に入る明細テーブル
function detailTable(d,print=false){
 const cls=print?'detail-print':'review-table detail-table';
 const trs=d.detailLines.map(r=>`<tr><td data-label="商品">${esc(r.name)}<br><span class="muted">${esc(r.sku)} ／ ${esc(r.id)}</span></td><td class="grade" data-label="学年">${esc(r.grade)}</td><td class="cls" data-label="組">${esc(r.classNo)}</td><td class="num" data-label="数量">${r.quantity.toLocaleString('ja-JP')}個</td><td class="num" data-label="参考単価">${fmt(r.price)}</td><td class="num" data-label="参考金額">${fmt(r.amount)}</td></tr>`).join('');
 const total=`<tr class="subrow"><td colspan="6">ご注文合計　${d.detailLines.reduce((sum,r)=>sum+r.quantity,0).toLocaleString('ja-JP')}個 ／ 参考金額（税込） ${fmt(d.amount)}</td></tr>`;
 return `<table class="${cls}"><thead><tr><th>商品・品番</th><th>学年</th><th>組</th><th class="num">数量</th><th class="num">参考単価</th><th class="num">参考金額</th></tr></thead><tbody>${trs}${total}</tbody></table>`;
}
function reviewHtml(d){
 return `<div class="review-section doc-number"><h3>${esc(docName(d))}（試作用下書き）</h3><dl class="review-list">${docFacts(d).map(([k,v])=>rowKV(k,v)).join('')}</dl></div><div class="review-section"><h3>学校・ご依頼情報</h3><dl class="review-list">${rowKV('依頼区分',d.requestType)}${rowKV('学校名',d.school)}${rowKV('ご担当',d.teacher)}${rowKV('電話番号',d.phone)}${rowKV('メール',d.email)}${rowKV('市区町村',d.city)}${rowKV('納品希望日',d.date)}${rowKV('担当営業',d.sales)}${rowKV('支払い方法',d.payment)}${rowKV('納品先・連絡',d.address,true)}</dl></div><div class="review-section"><h3>商品明細（クラス別納品単位）</h3><p class="detail-hint">同じ商品でも学年・組ごとに分けて記載しています。原則として各クラス単位の仕分け・納品をご希望として扱います。</p>${detailTable(d)}</div><div class="review-section"><h3>備考・ご相談</h3><p style="font-size:12px;white-space:pre-wrap">${esc(d.notes||'なし')}</p></div><p class="micro">作成日時：${esc(d.created)}｜表示金額はメーカー希望小売価格による参考計算です。実際の販売金額・納期・梱包方法はタナカ担当者が確認します。</p>`;
}
function buildPrint(d){
 const th=(k,v,wide=false)=>!v?'':`<div class="kv${wide?' wide':''}"><b>${esc(k)}</b><span>${esc(v)}</span></div>`;
 $('printSheet').innerHTML=`<div class="pmeta">株式会社タナカ　TEL 06-6997-6030 / FAX 06-6997-6035<br>作成日時：${esc(d.created)}</div><h1>${esc(docName(d))}（試作用下書き）</h1><div class="pkv p-number">${docFacts(d).map(([k,v])=>th(k,v)).join('')}</div><div class="pkv">${th('依頼区分',d.requestType)}${th('学校名',d.school)}${th('ご担当',d.teacher)}${th('電話番号',d.phone)}${th('メール',d.email)}${th('市区町村',d.city)}${th('納品希望日',d.date)}${th('担当営業',d.sales)}${th('支払い方法',d.payment)}${th('納品先・連絡',d.address,true)}</div><h2>商品明細（クラス別納品）</h2><p class="packing">※同一商品も学年・組ごとに別の明細行。原則、クラスごとに仕分け・納品。予備分は別梱包。</p>${detailTable(d,true)}<h2>備考・ご相談</h2><p style="white-space:pre-wrap">${esc(d.notes||'なし')}</p><p class="pdisclaimer">この書面はサイト試作版で作成した下書きです。タナカへの自動送信・正式注文受付は行われていません。<br>金額はメーカー公表の希望小売価格から算出した参考額です。実際の販売価格・送料・納期・梱包可否はタナカ担当者が別途案内します。<br>株式会社タナカ　大阪府守口市南寺方東通3-8-6　TEL 06-6997-6030　FAX 06-6997-6035</p>`;
}
function orderText(d){
 let x=[`【${d.requestType}（試作用下書き）】`,'※サイトからの自動送信・正式受付は未実施',...docFacts(d).map(([k,v])=>`${k}：${v}`),`作成日時：${d.created}`,`学校名：${d.school}`,`担当先生：${d.teacher}`,`電話：${d.phone}`,`メール：${d.email}`,`市区町村：${d.city}`,`納品先・連絡事項：${d.address}`,`納品希望日：${d.date}`,`担当営業：${d.sales}`,`支払方法：${d.payment}`,'','【商品明細（クラス別納品）】'];
 d.detailLines.forEach(r=>x.push(`${r.id} ${r.name}｜${r.grade}${r.classNo}｜${r.quantity}個｜参考単価 ${fmt(r.price)}｜参考金額 ${fmt(r.amount)}`));
 x.push(`合計：${d.detailLines.reduce((sum,r)=>sum+r.quantity,0)}個／参考金額（税込）：${fmt(d.amount)}`,'','※原則としてクラス単位の仕分け・納品を希望','', '【備考】',d.notes||'なし','','※メーカー公表の希望小売価格による参考計算です。タナカ販売価格とは異なる場合があります。');return x.join('\n');
}
function downloadCSV(d){
 const rows=[['区分',d.requestType],...docFacts(d),['学校名',d.school],['担当先生',d.teacher],['学校電話',d.phone],['返信先メール',d.email],['市区町村',d.city],['納品先・連絡事項',d.address],['納品希望日',d.date],['タナカ担当営業',d.sales],['支払方法',d.payment],['作成日時',d.created],['納品方法','原則クラス別に仕分け・納品'],[],['商品品番','商品名','学年','組','数量（個）','参考単価（税込）','参考金額（税込）'],...d.detailLines.map(r=>[r.id,r.name,r.grade,r.classNo,r.quantity,r.price,r.amount]),['','','','合計',d.detailLines.reduce((sum,r)=>sum+r.quantity,0),'参考合計（税込）',d.amount],[],['備考',d.notes],[],['注意','試作版のため自動送信なし／価格はメーカー公表参考価格']];
 const safe=s=>{let v=String(s??'');if(/^[\s\t]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
 const blob=new Blob(['\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`タナカ_${d.requestType}_${d.documentNumber}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function closeModal(){$('reviewModal').classList.remove('open');$('reviewModal').setAttribute('aria-hidden','true');document.body.style.overflow='';$('orderForm').querySelector('button[type="submit"]').focus()}

// 詳細画面：商品情報と学年・組別の注文内容を一つの画面で編集できる
let detailProductId='';
let detailRows=[];
let detailOpener=null;
function detailOptions(values,selected){return '<option value="">選択</option>'+values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('')}
function updateDetailTotal(){const n=detailRows.reduce((s,r)=>s+qty(r.count),0)+qty($('detailSpare').value);$('detailTotal').textContent=n.toLocaleString('ja-JP')+'個';return n}
function renderDetailRows(){
 const root=$('detailClassRows');root.innerHTML=detailRows.map((r,i)=>`<div class="detail-class-row"><select class="field" data-dgrade="${i}" aria-label="${i+1}行目の学年">${detailOptions(YEAR_OPTIONS,r.grade)}</select><select class="field" data-dclass="${i}" aria-label="${i+1}行目の組">${detailOptions(CLASS_OPTIONS,r.classNo)}</select><input class="field" type="number" inputmode="numeric" min="0" max="9999" value="${esc(r.count)}" data-dcount="${i}" aria-label="${i+1}行目の数量" placeholder="個"><button type="button" class="tiny-delete" aria-label="${i+1}行目を削除" data-dremove="${i}" ${detailRows.length<=1?'disabled':''}>削除</button></div>`).join('');updateDetailTotal()
}
function openProductModal(id, opener){
 const p=productById(id);if(!p)return;
 detailProductId=id;detailOpener=opener||null;
 const existing=classAllocations[id];
 detailRows=existing?existing.rows.map(r=>({grade:r.grade,classNo:r.classNo,count:r.count})):initialRows();
 $('detailSpare').value=existing?existing.spare:0;
 $('detailError').textContent='';
 $('detailContent').innerHTML=`<div class="detail-summary"><div class="detail-photo"><img src="${samplePhoto()}" alt=""><img class="photo-real" src="${p.image}" alt="${esc(p.name)}の商品写真" onload="this.style.opacity=1"></div><div><p class="detail-sku">サクラクレパス ｜ 品番 ${esc(p.sku)} ／ ${esc(p.id)}</p><h3>${esc(p.name)}</h3><p class="detail-desc">${esc(p.description)}</p><div class="detail-price">${fmt(p.price)} <span style="font-size:11px;font-weight:500">税込・メーカー公表参考価格</span></div><a class="product-detail-link" href="${p.url}" target="_blank" rel="noopener noreferrer">メーカー公式の詳しい仕様を見る ↗</a></div></div>`;
 renderDetailRows();
 $('productModal').classList.add('open');$('productModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
 $('closeProductModal').focus();
}
function closeProductModal(){
 $('productModal').classList.remove('open');$('productModal').setAttribute('aria-hidden','true');
 document.body.style.overflow='';if(detailOpener&&detailOpener.isConnected)detailOpener.focus();
}
$('categoryFilters').addEventListener('click',e=>{
 const b=e.target.closest('button[data-category]');if(!b)return;
 activeCategory=b.dataset.category;
 $('categoryFilters').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 renderProducts();$('products').scrollIntoView({behavior:'smooth'});
});
$('closeProductModal').addEventListener('click',closeProductModal);
$('detailCancel').addEventListener('click',closeProductModal);
$('productModal').addEventListener('click',e=>{if(e.target===$('productModal'))closeProductModal()});
$('detailClassRows').addEventListener('input',e=>{
 const t=e.target;const type=t.dataset.dgrade!==undefined?'grade':t.dataset.dclass!==undefined?'classNo':t.dataset.dcount!==undefined?'count':null;
 if(!type)return;const i=Number(t.dataset.dgrade??t.dataset.dclass??t.dataset.dcount);if(detailRows[i]){detailRows[i][type]=t.value;updateDetailTotal()}
});
$('detailClassRows').addEventListener('change',e=>{
 const t=e.target;const type=t.dataset.dgrade!==undefined?'grade':t.dataset.dclass!==undefined?'classNo':null;
 if(!type)return;const i=Number(t.dataset.dgrade??t.dataset.dclass);if(detailRows[i])detailRows[i][type]=t.value;
});
$('detailClassRows').addEventListener('click',e=>{const b=e.target.closest('button[data-dremove]');if(b&&detailRows.length>1){detailRows.splice(Number(b.dataset.dremove),1);renderDetailRows()}});
$('detailAddClass').addEventListener('click',()=>{
 if(detailRows.length>=30){$('detailError').textContent='1商品につき30行まで登録できます。';return}
 const prev=detailRows[detailRows.length-1];const n=detailRows.filter(r=>r.grade===prev.grade).length+1;
 detailRows.push({grade:prev.grade,classNo:n<=15?n+'組':'',count:''});renderDetailRows();
});
$('detailSpare').addEventListener('input',updateDetailTotal);
$('detailAddToCart').addEventListener('click',()=>{
 $('detailError').textContent='';
 const used=detailRows.filter(r=>qty(r.count)>0), spare=qty($('detailSpare').value), total=updateDetailTotal();
 if(!used.length){$('detailError').textContent='少なくとも1クラスの数量を入力してください。';return}
 if(used.some(r=>!r.grade||!r.classNo)){$('detailError').textContent='数量を入力した行は「学年」と「組」を両方選んでください。';return}
 const keys=new Set();for(const r of used){const key=r.grade+'|'+r.classNo;if(keys.has(key)){$('detailError').textContent='同じ学年・組は1行にまとめてください。';return}keys.add(key)}
 const p=productById(detailProductId);
 classAllocations[detailProductId]={productId:detailProductId,productName:p.name,rows:used.map(r=>({grade:r.grade,classNo:r.classNo,count:qty(r.count)})),spare,total};
 setCart(detailProductId,total,true);
 $('helperProduct').value=detailProductId;loadClassProduct(detailProductId);
 closeProductModal();flash(`${p.name}：${total}個をクラス別に登録しました`);scrollToOrder();
});

$('searchProduct').addEventListener('input',renderProducts);
$('productGrid').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(!b)return;openProductModal(b.dataset.detail,b)});
$('cartTop').addEventListener('click',scrollToOrder);
$('orderLines').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.plus||b.dataset.minus||b.dataset.remove||b.dataset.editclass;if(!id)return;if(b.dataset.editclass){$('helperProduct').value=id;loadClassProduct(id);$('class-helper').scrollIntoView({behavior:'smooth'});return}let n=cart[id]||0;if(b.dataset.plus)n++;else if(b.dataset.minus)n--;else n=0;setCart(id,n,true)});
$('orderLines').addEventListener('change',e=>{const input=e.target.closest('[data-qty]');if(input)setCart(input.dataset.qty,input.value,true)});
$('helperProduct').innerHTML=PRODUCTS.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
function handleClassField(e){
 const t=e.target;if(!t.dataset)return;
 const prop=t.dataset.rowgrade!==undefined?'grade':t.dataset.rowclass!==undefined?'classNo':t.dataset.rowcount!==undefined?'count':null;
 if(prop===null)return;
 const i=Number(t.dataset.rowgrade??t.dataset.rowclass??t.dataset.rowcount);
 if(classRows[i]){classRows[i][prop]=t.value;calcClass()}
}
$('classRows').addEventListener('input',handleClassField);
$('classRows').addEventListener('change',handleClassField);
$('classRows').addEventListener('click',e=>{const b=e.target.closest('[data-rowdel]');if(b&&classRows.length>1){classRows.splice(Number(b.dataset.rowdel),1);renderClasses()}});
$('addClass').addEventListener('click',()=>{
 if(classRows.length>=30)return flash('追加できる学年・組は30件までです');
 const previous=classRows[classRows.length-1];const n=classRows.filter(r=>r.grade===previous.grade).length+1;
 classRows.push({grade:previous.grade,classNo:n<=15?n+'組':'',count:''});renderClasses();
});
$('helperProduct').addEventListener('change',e=>loadClassProduct(e.target.value));
$('spareCount').addEventListener('input',calcClass);
$('applyClass').addEventListener('click',()=>{
 const sum=calcClass();if(!sum)return flash('学年・組ごとの数量、または予備数を入力してください');
 const used=classRows.filter(r=>qty(r.count)>0);
 const invalid=used.some(r=>!r.grade||!r.classNo);
 if(invalid){flash('数量を入力した行は「学年」と「組」の両方を選択してください');$('classRows').querySelector('select').focus();return}
 const labels=new Set();
 for(const r of used){const key=r.grade+'|'+r.classNo;if(labels.has(key)){flash('同じ学年・組が重複しています。1行にまとめてください');return}labels.add(key)}
 if(!used.length){flash('最低1クラスの学年・組と数量を入力してください');return}
 const id=$('helperProduct').value, p=productById(id);
 const rows=used.map(r=>({grade:r.grade,classNo:r.classNo,count:qty(r.count)}));
 classAllocations[id]={productId:id,productName:p.name,rows,spare:qty($('spareCount').value),total:sum};
 setCart(id,sum,true);flash('クラス別納品明細と合計 '+sum+'個をご注文内容に反映しました');scrollToOrder();
});
for(const r of document.querySelectorAll('[name="requestType"]'))r.addEventListener('change',()=>{$('paymentSection').classList.toggle('noshow',selectedRadio('requestType')==='見積依頼');const title=document.querySelector('#orderForm button[type=submit]');title.textContent=selectedRadio('requestType')==='見積依頼'?'内容を確認して、見積依頼書を作る →':'内容を確認して、ご注文内容を作る →'});
$('orderForm').addEventListener('submit',e=>{e.preventDefault();$('formError').textContent='';if(!totalCount()){$('formError').textContent='商品を1点以上選択してください。';$('products').scrollIntoView({behavior:'smooth'});return}const missing=PRODUCTS.filter(p=>cart[p.id]>0&&(!classAllocations[p.id]||classAllocations[p.id].total!==cart[p.id]));if(missing.length){$('formError').textContent='学年・組の内訳が未登録、またはご注文数量と一致しない商品があります。商品ごとに学年・組別の納品明細を登録してください。';$('helperProduct').value=missing[0].id;loadClassProduct(missing[0].id);$('class-helper').scrollIntoView({behavior:'smooth'});return}for(const id of ['schoolName','teacherName','phone','email']){const el=$(id);if(!el.value.trim()){ $('formError').textContent='必須項目を入力してください。';el.focus();return}}const email=$('email');if(!email.checkValidity()){$('formError').textContent='正しいメールアドレスを入力してください。';email.focus();return}if(!$('agree').checked){$('formError').textContent='確認事項にチェックを入れてください。';$('agree').focus();return}reviewData=getData();reviewData.documentNumber=makeDraftNumber(reviewData.requestType);reviewData.quoteReference=reviewData.requestType==='注文'&&lastQuoteReference?.school===reviewData.school?lastQuoteReference.number:'';if(reviewData.requestType==='見積依頼')lastQuoteReference={number:reviewData.documentNumber,school:reviewData.school};$('modalTitle').textContent=docName(reviewData)+'の確認';$('printOrder').textContent=docName(reviewData)+'を印刷・PDF保存';$('reviewContent').innerHTML=reviewHtml(reviewData);buildPrint(reviewData);$('reviewModal').classList.add('open');$('reviewModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('closeReview').focus()});
$('closeReview').addEventListener('click',closeModal);$('backEdit').addEventListener('click',closeModal);$('reviewModal').addEventListener('click',e=>{if(e.target===$('reviewModal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('reviewModal').classList.contains('open'))closeModal();else if($('productModal').classList.contains('open'))closeProductModal()}});
$('printOrder').addEventListener('click',()=>{if(reviewData)window.print()});$('csvOrder').addEventListener('click',()=>{if(reviewData)downloadCSV(reviewData)});$('copyOrder').addEventListener('click',async()=>{if(!reviewData)return;const content=orderText(reviewData);try{await navigator.clipboard.writeText(content);flash('注文内容をコピーしました')}catch{const ta=document.createElement('textarea');ta.value=content;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();flash(ok?'注文内容をコピーしました':'コピーできない場合は印刷をご利用ください')}});
renderProducts();renderCart();loadClassProduct($('helperProduct').value);

// 商品詳細ページから移動した場合のみ、指定商品の入力ダイアログを表示する。
const urlParams=new URLSearchParams(window.location.search);
const mode=urlParams.get('mode');
if(mode==='quote'||mode==='order'){
 const desired=mode==='quote'?'見積依頼':'注文';
 const radio=Array.from(document.querySelectorAll('[name="requestType"]')).find(r=>r.value===desired);
 if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
}
const pageProduct=urlParams.get('product');
if(pageProduct&&PRODUCTS.some(p=>p.id===pageProduct))openProductModal(pageProduct,null);
