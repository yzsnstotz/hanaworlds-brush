// Public DSH client module. Only fixture controls and compiled cells cross RPC.
window.__ModuleLoader__.load({
 id:'hanaworlds-brush-preview',
 factory:(require)=>{
  const React=require('react'),h=React.createElement,ID='hanaworlds-brush-preview';
  const ink='#172a35',muted='#627987',line='#dce5e8',teal='#176f65';
  const samples=[['house','小房子'],['fill','区域填充'],['carve','挖一个坑'],['invalid','非法样例（目录外材质）']];
  const names={'fixture:stone':'石头','fixture:dirt':'泥土','air':'挖空 / air'};
  const colors={'fixture:stone':'#788e98','fixture:dirt':'#b08c60','air':'#e6faf5'};
  const card={border:`1px solid ${line}`,borderRadius:14,padding:20,background:'#fff'};
  const field={boxSizing:'border-box',width:'100%',border:`1px solid ${line}`,borderRadius:8,padding:'10px 12px',background:'#fff',color:ink,fontSize:14};
  const label=(text,child)=>h('label',{style:{display:'grid',gap:8,color:muted,fontSize:13}},text,child);
  function Icon(){return h('svg',{viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:1.7},h('path',{d:'M12 3 3 8v8l9 5 9-5V8L12 3Zm0 10v8M3 8l9 5 9-5M7 5l10 6'}));}
  function Panel({ctx}){
   const [input,setInput]=React.useState({sample:'house',width:8,height:5,depth:8,material:'fixture:stone'});
   const [result,setResult]=React.useState(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
   const [layer,setLayer]=React.useState(0),[previous,setPrevious]=React.useState(null),[comparison,setComparison]=React.useState('');
   const generation=React.useRef(0),currentInput=React.useRef(input),active=React.useRef(true);
   React.useEffect(()=>()=>{active.current=false;generation.current++;},[]);
   function edit(key,value){const next={...input,[key]:value};currentInput.current=next;setInput(next);generation.current++;setResult(null);setError('');setComparison('');}
   async function compile(){
    if(busy)return;setBusy(true);setError('');setResult(null);setComparison('');
    const submitted={...input},key=JSON.stringify(submitted),run=++generation.current;
    try {
     const wire=await ctx.connection.rpc.call('/api','hanaworldsBrushPreview/compile',{args:{input:submitted}});
     if(!active.current||run!==generation.current||key!==JSON.stringify(currentInput.current))return;
     if(!wire.ok){setError(`Host 编译未完成：${wire.error.message??wire.error.code}`);return;}
     const out=wire.value;
     if(!out.ok){setError(out.error);return;}
     setResult(out);setLayer(0);
     if(previous?.input===key)setComparison(previous.digest===out.operationDigest?'与上次相同输入的结果标识一致。':'相同输入的结果标识发生变化。');
     setPrevious({input:key,digest:out.operationDigest});
    }catch(e){if(active.current&&run===generation.current)setError(`Host 编译失败：${e.message}`);}
    finally{if(active.current)setBusy(false);}
   }
   const visible=result?.cells.filter(c=>c.position[1]===layer)??[];
   const byPosition=new Map(visible.map(c=>[`${c.position[0]},${c.position[2]}`,c]));
   const tiles=[];
   if(result)for(let z=result.size[2]-1;z>=0;z--)for(let x=0;x<result.size[0];x++){
    const cell=byPosition.get(`${x},${z}`),air=cell?.nodeName==='air';
    tiles.push(h('div',{key:`${x},${z}`,title:`(${x},${layer},${z}) · ${cell?names[cell.nodeName]??cell.nodeName:'未指定'}`,style:{aspectRatio:'1',minWidth:0,borderRadius:3,background:cell?colors[cell.nodeName]??'#8e96bd':'#f4f6f6',border:air?'1px dashed #38a58f':`1px solid ${cell?'#ffffff55':'#e6ebed'}`,display:'grid',placeItems:'center',color:teal,fontSize:12}},air?'−':null));
   }
   const title=text=>h('h3',{style:{fontSize:14,fontWeight:650,margin:'0 0 14px'}},text);
   const inputs=h('section',{style:card},title('01 / 样例输入'),h('div',{style:{display:'grid',gap:18}},
    label('样例',h('select',{value:input.sample,onChange:e=>edit('sample',e.target.value),style:field},...samples.map(([value,text])=>h('option',{key:value,value},text)))),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}},...['width','height','depth'].map((key,i)=>label(['宽 X','高 Y','深 Z'][i],h('input',{key,type:'number',min:1,step:1,value:input[key],onChange:e=>edit(key,e.target.value===''?'':Number(e.target.value)),style:field})))),
    label('材质',h('select',{value:input.material,disabled:input.sample==='carve',onChange:e=>edit('material',e.target.value),style:field},h('option',{value:'fixture:stone'},'石头 · fixture:stone'),h('option',{value:'fixture:dirt'},'泥土 · fixture:dirt'))),
    input.sample==='carve'?h('p',{style:{fontSize:12,color:muted,margin:0}},'挖坑输出显式 air；不把未指定格子变成空气。'):null,
    h('button',{disabled:busy,onClick:compile,style:{border:0,borderRadius:9,padding:'12px 18px',background:busy?'#94b8ae':teal,color:'#fff',fontSize:14,fontWeight:600,cursor:busy?'wait':'pointer'}},busy?'Host 正在编译…':'编译'),
    error?h('div',{role:'alert',style:{color:'#9c352e',background:'#fff1ef',borderRadius:8,padding:12,fontSize:13}},error):null));
   const legend=h('div',{style:{display:'flex',flexWrap:'wrap',gap:12,fontSize:12,color:muted,marginTop:12}},...['fixture:stone','fixture:dirt','air','unspecified'].map(name=>h('span',{key:name},h('span',{style:{display:'inline-block',width:11,height:11,border:'1px solid #bacbd0',background:colors[name]??'#f4f6f6',borderRadius:2,marginRight:5}},''),names[name]??'未指定')));
   const preview=result?h(React.Fragment,null,
    h('div',{style:{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:18}},h('strong',{style:{fontSize:20}},`${result.cellCount.toLocaleString()} 个方块`),label('当前层 Y',h('input',{type:'number',min:0,max:result.size[1]-1,step:1,value:layer,onChange:e=>{const y=Number(e.target.value);if(Number.isInteger(y)&&y>=0&&y<result.size[1])setLayer(y);},style:{...field,width:88}}))),
    h('div',{style:{display:'grid',gridTemplateColumns:`repeat(${result.size[0]},minmax(0,1fr))`,gap:3,width:'100%',maxWidth:420,margin:'0 auto'}},...tiles),
    h('p',{style:{fontSize:12,color:muted,margin:'15px 0 0'}},`俯视 Y=${layer} 层 · ${visible.length} 格 · X 向右，Z 向上`),legend):
    h('div',{style:{padding:'70px 12px',textAlign:'center',color:muted,fontSize:14}},'点「编译」后，预览会显示在这里。');
   const materials=result?h('div',null,title('03 / 材质计数'),h('table',{style:{width:'100%',fontSize:13,borderCollapse:'collapse'}},
    h('thead',null,h('tr',null,h('th',{style:{textAlign:'left',paddingBottom:10,color:muted}},'材质 / param2'),h('th',{style:{textAlign:'right',paddingBottom:10,color:muted}},'方块数'))),
    h('tbody',null,...result.materials.map(m=>h('tr',{key:`${m.nodeName}:${m.param2}`},h('td',{style:{padding:'9px 0',borderTop:`1px solid ${line}`}},`${names[m.nodeName]??m.nodeName} · ${m.param2}`),h('td',{style:{textAlign:'right',borderTop:`1px solid ${line}`}},m.count.toLocaleString())))))):null;
   const chunks=result?h('div',null,title(`04 / 地图块分组 · ${result.chunks.length} 块`),h('div',{style:{maxHeight:240,overflow:'auto'}},...result.chunks.map(c=>h('div',{key:c.chunkPos.join(','),style:{padding:'9px 0',borderTop:`1px solid ${line}`,fontSize:12}},h('div',null,`地图块 [${c.chunkPos.join(', ')}] · ${c.count} 个方块`),h('code',{title:c.operationDigest,style:{display:'block',color:muted,fontSize:10,overflowWrap:'anywhere',marginTop:4}},c.operationDigest))))):null;
   const identity=result?h('div',{style:{gridColumn:'1 / -1'}},title('结果标识'),h('code',{style:{display:'block',padding:12,background:'#f3f7f7',borderRadius:8,fontSize:12,overflowWrap:'anywhere'}},result.operationDigest),h('p',{style:{fontSize:12,color:comparison.startsWith('相同输入')?'#9c352e':teal,margin:'10px 0 0'}},comparison||'再编译一次相同输入，可以核对结果标识。')):null;
   return h('main',{style:{height:'100%',overflow:'auto',padding:'32px clamp(18px,4vw,48px)',background:'#f5f8f8',color:ink,fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}},
    h('div',{style:{maxWidth:1080,margin:'0 auto'}},
     h('div',{style:{fontSize:11,fontWeight:650,letterSpacing:2,color:teal,marginBottom:10}},'BRUSH / 开发面板'),
     h('h1',{style:{fontSize:28,fontWeight:650,margin:'0 0 10px'}},'Brush 编译预览'),
     h('p',{style:{color:muted,fontSize:14,margin:'0 0 22px'}},'选择一个样例，看看它会被编译成哪些方块。'),
     h('div',{style:{padding:'12px 16px',marginBottom:24,background:'#e9f3ef',border:'1px solid #c9e2d7',borderRadius:10,fontSize:13,color:'#23594d'}},'FIXTURE 样例：材料目录、世界与会话均为测试数据。Brush 0.5.0 在 Host 编译；此面板没有世界写入操作。'),
     h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',gap:22,alignItems:'start'}},inputs,h('section',{style:{...card,minHeight:300}},title('02 / 方块预览'),preview)),
     result?h('section',{style:{...card,marginTop:22}},h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:24}},materials,chunks,identity)):null));
  }

  function apply(ctx){
   ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:ID},()=>h(Panel,{ctx})));
   ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:ID,order:32,label:()=> 'Brush 编译预览'},Icon));
  }
  return {name:ID,inject:['slots','layout','connection'],apply,Panel};
 }
});
