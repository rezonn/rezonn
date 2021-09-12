
function newhtml(tag,attributes,ths) {
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
    rv.ctx.moveTo2 = function(p){rv.ctx.moveTo(p[0],p[1])};
    rv.ctx.lineTo2 = function(p){rv.ctx.lineTo(p[0],p[1])};
    rv.ctx.rect4 =function(p, color) {
      this.fillStyle = color||"black";
      this.fillRect(p[0], p[1], p[2], p[3]);
    }
    rv.ctx.text = function(text,p,size,color) {
      this.fillStyle = color||"black";
      this.font = size+"px serif";
      this.fillText(text, p[0], p[1]);
    }
  }
  if (ths) ths.appendChild(rv);
  return rv;
}

function stst(text) {console.log((text||"")+" "+tf.memory().numTensors+"->"+(tf.memory().numBytesInGPU/1000000 >> 0))}

async function norm(tensor) {
  //stst("b");
  let float = tensor.toFloat();
  var max = await float.max();
  var min = await float.min();
  //console.log(min+"..."+max);
  let normed = float.sub(min).div(max.sub(min));
  tensor.dispose();
  max.dispose();
  min.dispose();
  float.dispose();
  //stst("a");
  return normed;
}