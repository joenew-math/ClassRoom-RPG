/* Teacher-only bridge for the local dungeon campus editor.
 * A server-verified class membership grants access to the exact popup window.
 * No role or credential is persisted in the URL or localStorage.
 */
"use strict";
(()=>{
  let editor=null,grant=null,unsubscribe=null,opening=false;
  const currentTeacher=()=>{
    const user=FB.auth&&FB.auth.currentUser;
    return user&&user.uid&&user.email&&FB.user&&FB.user.uid===user.uid
      &&CLOUD.cid&&CLOUD.role==='teacher'&&view.role==='teacher'&&view.page==='teacher'
      ?{uid:user.uid,email:user.email,cid:String(CLOUD.cid)}:null;
  };
  const sameTeacher=(a,b)=>!!a&&!!b&&a.uid===b.uid&&a.email===b.email&&a.cid===b.cid;
  const revoke=()=>{grant=null;if(unsubscribe){unsubscribe();unsubscribe=null;}};
  window.classRpgCanEditDungeonMap=requester=>{
    if(!sameTeacher(grant,currentTeacher())){revoke();return false;}
    if(!editor||editor.closed||requester!==editor)return false;
    try{return editor.location.origin===location.origin&&editor.location.pathname===new URL(DUNGEON_URL,location.href).pathname;}
    catch(_){return false;}
  };
  window.openDungeonCampusEditor=async()=>{
    if(opening)return;
    const who=currentTeacher();
    if(!who){toast('請先以教師身分登入並選擇班級',true);return;}
    if(editor&&!editor.closed&&sameTeacher(grant,who)){editor.focus();return;}
    revoke();
    const popup=window.open('about:blank','classRpgDungeonCampusEditor');
    if(!popup){toast('請允許彈出式視窗以開啟地圖編輯器',true);return;}
    editor=popup;
    opening=true;
    try{
      const ref=FB.db.collection('classes').doc(who.cid);
      const doc=await ref.get({source:'server'});
      if(editor!==popup||popup.closed||!sameTeacher(who,currentTeacher()))throw Error('登入身分或班級已切換');
      if(!doc.exists||!(doc.data().teacherEmails||[]).includes(who.email))throw Error('此帳號沒有本班教師權限');
      grant=who;
      unsubscribe=ref.onSnapshot(next=>{
        if(!next.exists||!(next.data().teacherEmails||[]).includes(who.email))revoke();
      },()=>revoke());
      popup.location.href=DUNGEON_URL+'?campusEditor=1';
    }catch(error){
      if(editor===popup)revoke();
      if(!popup.closed)popup.close();
      toast('地圖編輯器無法開啟：'+(error.message||error),true);
    }finally{opening=false;}
  };
  if(FB.auth&&FB.auth.onAuthStateChanged)FB.auth.onAuthStateChanged(user=>{
    if(grant&&(!user||user.uid!==grant.uid||user.email!==grant.email))revoke();
  });
  window.addEventListener('beforeunload',revoke);
})();
