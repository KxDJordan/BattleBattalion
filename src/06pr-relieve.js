/* ================= ICONS for Relieve (the Bulwark's place trade; rules: 64y-relieve.js; the tree: MAST.bulwark in 10-data.js) =================
   ab-relieve: the Bulwark's steel heater shield with two arrows trading places, the brass one going forward (the Bulwark steps in), the
   madder one coming back (the wounded friend steps out). It reads apart from the weapon swap (two bare arrows) and from Intercept's
   shield slam. 16 px pixel (Detail Low): drawn here, outlined like the set; painted (Detail High): the 06p kit, the arrows as an exchange
   arc around the shield. This file only adds entries. */
if(typeof ICONS==='object'&&ICONS&&typeof _icOutline==='function')ICONS['ab-relieve']=_icOutline([
 '................','................','............d...','.qqqqqq.....dd..','.qrrqqp.eddddcd.','.qrdqqp.dcccccb.','.qdcdqp.....cb..','.qqdqpp.....b...',
 '.qqcqpp.........','..qqqp....h.....','..qqpp...hg.....','...qp...hgggggg.','...po...gffffff.','.........gf.....','..........f.....','................']);
(function(){if(typeof PAINT!=='object'||!PAINT||typeof pkArc!=='function')return;const P=PAINT;
 // an arrow along an arc (0 = up, clockwise), its head at a1 pointing on round the circle
 const arc=(g,cx,cy,r,a0,a1,mat)=>{pkFill(g,pbTubeF(pkArc(cx,cy,r,a0,a1,24),pbTaper(3.6,1.2)),mat,{k:.55,lw:PK.lw*.85});
  const a=a1*Math.PI/180,x=cx+Math.sin(a)*r,y=cy-Math.cos(a)*r,s=a1>a0?1:-1,tx=Math.cos(a)*s,ty=Math.sin(a)*s,nx=-ty,ny=tx;
  pkFill(g,pkPoly([x+tx*5.4,y+ty*5.4,x+nx*4.2-tx*.6,y+ny*4.2-ty*.6,x-nx*4.2-tx*.6,y-ny*4.2-ty*.6]),mat,{k:.5,lw:PK.lw*.85})};
 P['ab-relieve']=g=>{arc(g,16,16.4,12.4,-62,58,'gold');arc(g,16,16.4,12.4,118,238,'madder');
  pkShield(g,16,16.6,{kind:'heater',w:14.6,h:17,mat:'steel',rim:'silver',boss:2.8,bossMat:'gold'})};})();
