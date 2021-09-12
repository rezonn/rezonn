function newhtml(tag,attributes,ths) {
  if (tag=="svg" || tag=="rect" || tag=="g" || tag=="text" || tag=="polyline" || tag=="circle" || tag=="filter" || tag=="feDropShadow") {
    var xmlns = "http://www.w3.org/2000/svg";
    var rv = document.createElementNS(xmlns, tag);
    for (var x in attributes) {
      if (x!="style") {
        rv.setAttributeNS(null, x, attributes[x]);
        rv[x]=attributes[x];
      }
      else {
        for (var s in attributes[x]) {
          rv.style[s] = attributes[x][s];
        }
      }
    }
    if (ths) ths.appendChild(rv);
    return rv;
  }
  else {
    var rv = document.createElement(tag);
    for (var x in attributes) {
      if (x!="style") rv[x] = attributes[x];
      else {
        for (var s in attributes[x]) {
          rv.style[s] = attributes[x][s];
        }
      }
    }
    if (tag=="canvas") {
      rv.ctx = rv.getContext("2d");
      rv.ctx.canvas = rv;
    }
    if (ths) ths.appendChild(rv);
    return rv;
  }
}

function coord(eventtype, poshtml, eventhtml) {
  if (!eventhtml) eventhtml=poshtml;
  var prm = new Promise((resolve, reject) => {
    eventhtml[eventtype] = function(e) {
      eventhtml[eventtype] = undefined;
      var p = [
        e.x-poshtml.getBoundingClientRect().left,
        e.y-poshtml.getBoundingClientRect().top
      ];
      return resolve(p);
    };
  });
  if (prm.isResolved) return promise;
  var isResolved = false;
  var isRejected = false;
  var result = prm.then(
   function(v) { isResolved = true; return v; }, 
   function(e) { isRejected = true; throw e; }
  );
  result.isFulfilled = function() { return isResolved || isRejected; };
  result.isResolved = function() { return isResolved; }
  result.isRejected = function() { return isRejected; }
  return result;
}

function diff(v1,v2) {return [v2[0]-v1[0],v2[1]-v1[1]];}
function plus(v1,v2) {return [v2[0]+v1[0],v2[1]+v1[1]];}
function round(v,m) {return v.map((a)=>Math.round(a/m)*m);}
function scale(v,s) {return v.map((a)=>Math.round(a*s));}

function getTransforms(obj) {
  var transforms = obj.transform.baseVal;
  if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
    var translate = svg.createSVGTransform();
    translate.setTranslate(0, 0);
    obj.transform.baseVal.insertItemBefore(translate, 0);
  }
  var transform = transforms.getItem(0);
  return transform;
}

async function moveInstrment(obj1) {
  obj = obj1.parentNode;
  var transform = getTransforms(obj);
  var p0 = await coord("onmousedown",svg,obj1);
  var p1 = coord("onmouseup",svg);
  var scf = svg.viewBox.baseVal.width/svg.getBoundingClientRect().width;
  while (!p1.isResolved()) {
    var p = await coord("onmousemove",svg);
    p = scale(p,scf);
    p = round(p,15);
    transform.setTranslate(p[0], p[1]);
    updatePolylines();
  }
  moveInstrment(obj1);
}

function updatePolylines() {
  var ps = svg.childNodes;
  var getPos = (node)=>[node.getBoundingClientRect().left>>0, node.getBoundingClientRect().top>>0];
  var scf = svg.viewBox.baseVal.width/svg.getBoundingClientRect().width;
  for (var i=0;i<ps.length;i++) {
    var node = ps[i];
    if (node.tagName=="polyline") {
      var s = diff(getPos(svg), getPos(node.start));
      s = scale(s,scf);
      s = plus(s,[2,2]);
      var e = diff(getPos(svg), getPos(node.end));
      e = scale(e,scf);
      e = plus(e,[2,2]);
      node.setAttribute('points', lb(s,e) );
    }
  }
}

function lb(p0,p) {
  var mt = [(p[0]+p0[0])/2,p0[1]];
  var md = [(p[0]+p0[0])/2,p[1]];
  return [p0,mt,md,p].map(a=>a.map(b=>b>>0).join(",")).join(" ");
}

async function joinStartInstrument(obj1) {
  var scf = svg.viewBox.baseVal.width/svg.getBoundingClientRect().width;
  var p0 = await coord("onmousedown",svg,obj1);
  p0 = scale(p0,scf);
  var polyline = newhtml("polyline",{points:lb(p0,p0),fill:"none",stroke:"#000","stroke-width":"0.5"},svg);
  window.ware = polyline;
  window.ware.start = obj1;
  var p1 = coord("onmouseup",svg);
  while (!p1.isResolved()) {
    var p = await coord("onmousemove",svg);
    p = scale(p,scf);
    polyline.setAttribute('points', lb(p0,p) );
  }
  try {
    if (!window.ware.connected) window.ware.parentNode.removeChild(window.ware);
  } catch(e){}
  joinStartInstrument(obj1);
}

async function joinEndInstrument(obj1) {
  var p0 = await coord("onmouseup",svg,obj1);
  if (window.ware) {
    console.log(window.ware);
    window.ware.end = obj1;
    window.ware.connected = true;
    window.ware = false;
  }
  joinEndInstrument(obj1);
}

async function saveModelLink(model, fname, parentNode) {
  if (!fname) fname = "policyNet";
  await model.save('localstorage://'+fname);
  var data = [];
  for(var i=0; i<localStorage.length; i++) {
  var key = localStorage.key(i);
  if (key.indexOf(fname)>-1)
    data.push({"key":key,"data":localStorage.getItem(key)});
  }
  var blob = new Blob([JSON.stringify(data)], {type: "application/json"});
  var url  = URL.createObjectURL(blob);
  var a = newhtml("a", {
    href:url,
    download:fname+".json",
    textContent:"save as json "
  }, parentNode);
}

async function loadModel(data,fname) {
  if (!fname) fname = "policyNet";
  for(var i=0; i<data.length; i++) {
    localStorage.setItem(data[i].key, data[i].data);
  }
  return await tf.loadLayersModel("localstorage://"+fname);
}

function visualizeModel(div, model) {
  var ttl = newhtml("span",{innerText:"drag json here ↓"},div);

  var divBB = [div.getBoundingClientRect().width,div.getBoundingClientRect().height];
  divBB = round(scale(divBB,0.2),1);
  //alert(divBB)

  svg = newhtml("svg",{viewBox:"0 0 "+divBB.join(" "),style:{"webkitTouchCallout":"none","webkitUserSelect":"none"}},div);
  svg.ondragover = function () { div.style.background="#eee";return false; };
  svg.ondragend = function () { div.style.background="none";return false; };

  async function readFile(entry) {
    return new Promise((resolve, reject) => {
      try {
        entry.file(function(file) {
          resolve(file);
        });      
      }
      catch (e) {reject()}
    });
  }

  
  function readFileList(folder) {
    //while (!folder.webkitGetAsEntry()) x=1
    var reader = folder.webkitGetAsEntry().createReader();
    return new Promise((resolve, reject) => {
      try {
        reader.readEntries(function(files) {
          resolve(files);
        }, reject);        
      }
      catch(e) {console.log(e.message)}
    });
  }
  
  svg.ondrop = async function (e) {
    this.className = '';
    e.preventDefault();
    var addDirectory = (item)=>{
      if (item.isDirectory) {
        console.log("dir");
        item.createReader().readEntries(function(entries) {
          entries.forEach((entry)=>addDirectory(entry));
        });
      } else {
        item.file(function(file){
          //console.log(file.name)
        });
      }
    }    

    if (e.dataTransfer.files.length==1) {
      //import json
      var data = JSON.parse(await e.dataTransfer.files[0].text());
      newmodel = await loadModel(data);
      if (div.model) div.model.setWeights(newmodel.getWeights());
      else div.model = model;
      rendmodel(div.model);
      div.style.background="none";
      saveModelLink(model, "policyNet", ttl);
    }
    else {
      //import images
      var data = [];
      var labels = [];
      if (e.dataTransfer && e.dataTransfer.items) {
        var folders = e.dataTransfer.items;
        console.log("folders.length="+folders.length);
        let promises = [];
        for (var i=0; i<folders.length; i++) {
          promises.push(readFileList(folders[i]));
        }
        var filesLists = await Promise.all(promises);
        for (var i=0;i<filesLists.length;i++) {
          var files = filesLists[i];
          for (var j=0;j<files.length;j++) {
            const file = await readFile(files[j]);
            var blob = new Blob([file], {type: 'image/jpeg'});
            var image = new Image();
            image.src = URL.createObjectURL(blob);
            document.body.appendChild(image);
            labels.push(i);
          }
        }
        console.log("folders.length="+folders.length);
        var ys = tf.oneHot(tf.tensor1d(labels, 'int32'), folders.length);
        ys.print();
      }
      

    }

    /*
    // Fallback
    var files = e.target.files || e.dataTransfer.files;
    if (!files.length) {
      alert('File type not accepted');
      return;
    }

    var files = await e.dataTransfer.items;

    for (var i = 0,files2=[]; i < files.length; i++) {
      files2.push(files[i]);
      zz = files[i];
    }

    alert(files2.map(f=>f.name).join("\n"))
    */

  }
  if (model) {
    div.model = model;
    rendmodel(div.model);
  }
}

function newnode(props) {
  var box = {x:0,y:0,w:10,h:15};
  box.rend = function (coord) {
    var [x,y,w,h] = [this.x,this.y,this.w,this.h];
    var p = 2;
    g = newhtml("g",{},svg);
    var titl = newhtml("rect",{x:x,y:y,width:w,height:h,fill:"white",box:this,stroke:"#000","stroke-width":0.5},g);
    moveInstrment(titl);
    newhtml("text",{x:x+1,y:y+3,textContent:(props.name||"node"),fill:'#000',style:{fontSize:"3px",pointerEvents:"none"}},g);
    newhtml("text",{x:x+1,y:y+8,textContent:(props.inputShape||"node"),fill:'#000',style:{fontSize:"3px",pointerEvents:"none"}},g);
    newhtml("text",{x:x+1,y:y+13,textContent:(props.outputShape||"node"),fill:'#000',style:{fontSize:"3px",pointerEvents:"none"}},g);
    var inio = newhtml("circle",{cx:x-p,cy:y+h/2,r:p,box:box,id:props.id+"_in"},g);
    joinStartInstrument(inio);
    joinEndInstrument(inio);
    var ouio = newhtml("circle",{cx:x+w+p,cy:y+h/2+5,r:p,fill:"#000",box:box,id:props.id+"_out"},g);
    joinStartInstrument(ouio);
    joinEndInstrument(ouio);
    box.g = g;
    return this;
  }
  return box;
}

function rendmodel(model) {
  var nodes = model.layers.map(function(l,i){
    var node = newnode({
      id:l.name.toString(),
      name:l.getClassName(),
      inputShape:l.input.shape.toString().slice(1),
      outputShape:l.output.shape.toString().slice(1)
    });
    node.rend();
    getTransforms(node.g).setTranslate(i*30+10, 20);
    return node;
  });
  model.layers.map(function(l,i){
    l.inboundNodes[0].inboundLayers.map(function(s) {
      if (s.name.indexOf("_input")==-1) {
        var polyline = newhtml("polyline",{points:"0,0 10,10",fill:"none",stroke:"#000","stroke-width":"0.5"},svg);
        polyline.start = document.getElementById(s.name+"_out");
        polyline.end = document.getElementById(l.name+"_in");    
      }
    });
  });
  updatePolylines();
}

