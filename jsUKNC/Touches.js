
// keyboard on buttons
// touch things
// (not a best way to do, but it works somehow)


TOUCH_ = ('ontouchstart' in document.documentElement);
MOBILE_ = (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i));

var EVENT = { type: "", keyCode: 0, which:0, location:0,
 preventDefault: function() {} , stopPropagation: function() {} }; 
 
KBUT_ = [];

NUMPAD = false;

var TouchesNow = 0;

function AddKeyButtons()
{
    addKey( "Esc",0, 4,  774,10, 90,90 );
    addKey( "Enter",0, 111,  870,10, 180,90 );
    
    addKey( "Left",0, 78,  764,130, 100,220 );
    addKey( "Up",0, 108,  870,116, 100,110 );
    addKey( "Down",0, 92,  870,240, 100,110 );
    addKey( "Right",0, 91,  976,130, 100,220 );
    
    addKey( "Shift",0, 69,  934, 386, 140,90 );
    addKey( "Space",0, 75,  764,386, 160,90 );
}

KBF_ = [];
function keyLifter()
{
var i,o;
for(i in KBF_)
 {
  o = KBF_[i];
  o.i++;
  if(o.i>=6)
   {
    popKey(o.c);
    KBF_.splice(i,1);
   }
 }
 setTimeout('keyLifter()',20);
}

function touchpushKey(c)
{
var i,o,y=1;
for(i in KBF_)
 {
  o = KBF_[i];
  if(o.c==c) { y=0; break; }
 }
if(y)
 {
  pushKey(c,1);	// do not release
  KBF_.push( { i:0, c:c } );
 }
else o.i=0;
}

function touchpopKey(c)
{
var i,o;
for(i in KBF_)
 {
  o = KBF_[i];
  if(o.c==c)
   {
    popKey(o.c);
    KBF_.splice(i,1);
   }
 }
}

function addKey(n,f,c,x,y,w,h)
{
 var s = '<div class="disSel" style="position:absolute; left:'+x+'px;top:'+y+'px;'+
	'visibility:hidden"><img id="kButt'+c+'" src="' +
	(document.location.href.substr(0,4)=="http"? '/keybimgs/' : './keybimgs/')+
(f?f:n)+'.png" width="'+w+'" height="'+h+'" alt="'+n+'" >' +
  '</div>';
 KBUT_.push(c);   
 document.write(s);
}

//function GE(id) { return document.getElementById(id); }
function DummyEv(e) { e.stopPropagation(); e.preventDefault(); return false; } 

function touchLoads()
{
 var O,i,f=0;
 for(i in KBUT_)
   if(GE("kButt"+KBUT_[i])==null) f=1;

 if(f) setTimeout('touchLoads()',999);
 else
  {
  for(i in KBUT_)
  {
   O = GE("kButt"+KBUT_[i]);
   if(TOUCH_)
   {
   O.addEventListener("touchstart", TouchClick, false);
   O.addEventListener("touchmove", DummyEv, false);
   O.addEventListener("touchend", TouchUp, false);
   }
  else
   {
   O.addEventListener("mousedown", TouchClick, false);
   }
   O.style.zIndex = 5555;
  }
  NumpadLoads();
  }
}

function touchShow(to)
{
 var c=''+to+" "+NUMPAD;		// not to redraw too much
 if(TouchesNow!=c) {
 
 var Q = GE("numpad");
 Q.style.visibility = (to && NUMPAD ? "visible": "hidden");
 ShowNumpad(to && NUMPAD);
 for(var i in KBUT_)
  {
   var O = GE("kButt"+KBUT_[i]);
   O.style.visibility = (to && (!NUMPAD) ? "visible" : "hidden");
  }
  TouchesNow = c;
 }
}

function TouchClick(e)
{
e.stopPropagation(); e.preventDefault();
var t = e.target; if(!t) t=e.currentTarget;
var c = parseInt(t.id.substr(5));
c = touch_subst_get(c);
touchpushKey(c);
} 

function TouchUp(e)
{
e.stopPropagation(); e.preventDefault();
var t = e.target; if(!t) t=e.currentTarget;
var c = parseInt(t.id.substr(5));
c = touch_subst_get(c);
touchpopKey(c);
} 

if(!TOUCH_) keyLifter();	/* This lifts mouse press events */

AddKeyButtons();

//-----
var touch_subst_keys = [];	// can remap some touches too (as in Keyboard.js) for games

function touch_Subst_Key( onecode, code ) {
	touch_subst_keys.push( { f: onecode, uknc: code } );
}

function touch_subst_get(c) {		// substitute one uknc keycode to other
	for(var j=0; j<touch_subst_keys.length; j++) {
		var Sb = touch_subst_keys[j];
		if( Sb.f == c ) { c = Sb.uknc; break; }
	}
	return c;
}

/* NUMPAD virtual keyboard */

var NmpCd = [];

function divByPos(v,h) {
	if(!NmpCd.length) NmpCd = keyboard.getNumpadCodes();
	return "nump_" + NmpCd[(v*3)+h].toString();
}

function crea_Numpad(left_x, top_y) {
 for(var v=0; v<5; v++)
  for(var h=0; h<3; h++) {
	var x = left_x + 4 + (h*98) + ((h>0) ? (h-1)*4 : 0);
	var y = top_y + 4 + (v*95) + ((v>0) ? (v-1)*4 : 0);
	document.write('<div id="' + divByPos(v,h) + '" style="position:absolute;left:' +
		parseInt(x) +';top:' + parseInt(y) + ';width:84;height:84;visibility:visible;"></div>');
	}
}

function NumpadLoads()
{
 for(var v=0; v<5; v++)
  for(var h=0; h<3; h++)
  {
   var O = GE( divByPos(v,h) );
   if(TOUCH_)
   {
   O.addEventListener("touchstart", TouchClick, false);
   O.addEventListener("touchmove", DummyEv, false);
   O.addEventListener("touchend", TouchUp, false);
   }
  else
   {
   O.addEventListener("mousedown", TouchClick, false);
   }
   O.style.zIndex = 5556;
  }
  
}

function ShowNumpad(on) {
 for(var v=0; v<5; v++)
  for(var h=0; h<3; h++)
  {
   var O = GE( divByPos(v,h) );
   O.style.visibility = (on ? "visible" : "hidden");
  }
}