let installPrompt;
const installButton=document.querySelector('.install');
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installButton.style.display='inline-flex';});
installButton.addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==='accepted')installButton.style.display='none';installPrompt=null;});
window.addEventListener('appinstalled',()=>{installButton.style.display='none';installPrompt=null;});
if('serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{});});
