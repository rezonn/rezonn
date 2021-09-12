Server = {};
Server.site = function(){return document.URL.split("/").slice(0,3).join("/");}
Server.list = async function(path){};
Server.text = async function(path){
	//console.log(Server.site()+path);
	return await (await fetch(Server.site()+path)).text();
};
Server.delete = async function(path){
	console.log(Server.site()+path);
	return await fetch(Server.site()+path,{method:'DELETE'});
};
Server.meta = async function(path){
	return (await fetch(Server.site()+path)).headers;
};
Server.json = async function(path){
	try {
		return await (await fetch(Server.site()+path)).json();
	} catch(e){return[]}
};
Server.save = async function(blob,path){return await fetch(Server.site()+"/"+path, {method: 'POST', body: blob});};
Server.saveCanvas = async function(canvas,path){
	const blob = await new Promise(resolve => canvas.toBlob(resolve));
	return Server.save(blob,path)
};
Server.run = async function(cmd){return await (await fetch(Server.site()+"/"+encodeURI(cmd), {method: 'PATCH'})).text()};
Server.savetext = async function(string,path) {
	var blob = new Blob([new Uint8Array([0xEF,0xBB,0xBF]),string],{type:"text/plain;charset=utf-8"});
	return await Server.save(blob,path);
}
Server.savejson = async function(path,json){
	let blob = JSON.stringify(json).toBlob();
	return Server.save(blob,path)
};