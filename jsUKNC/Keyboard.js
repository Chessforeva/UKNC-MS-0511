/*
	UKNC keyboard
  
	Notes on the keyboard mapping table.
	(remapped and replaced somehow, feels good for Basic editor)
	
	
	The 1st is browser code, when keypress event happens.
	After come UKNC codes to process:
	  Latin, Latin when Shift pressed. The same are for Rus. Also graphics symbols.  
	The original keyboard "Cuken" differs much, so tried to make it "Querty"-friendly.
	Left Alt,Ctrl,Shift keys left without direct keypress actions, except some Alt+key cases.  
*/
  
Keyboard = function()
{
 var self = this;
 
 var /*boolean*/capsLocked = false;
 var /*boolean*/shiftPressed = false;
 var /*boolean*/rusAlf = false;
 var fHomeCtrl = 0;					// Home substituted Ctrl (УПР or СУ) flag (on,off)
  
 var keysbuffer = [];			// Queue to process keys, waiting to press
 var keyspressed = [];			// Queue to hold pressed keys
 var lastKEY = 0;

 var reset = 0;			// on reset loads prepared .uknc
 
 var subst_keys = [];	// can remap some keys for games
 
 this.keymap = [];
 
this.addKey =  function( code, set ) {
	keysbuffer.push( { keycode:code, pressed:set } );
} 
 
 this.Capsed = function() {
	self.addKey(71/*0107*/,1);	// + Fiks
	self.addKey(69,1);	// Shift
	self.addKey(69,0);	// release Shift
	self.addKey(71,0);	// release Fiks
	}
 this.setAlf = function() { 
	self.addKey(71/*0107*/,1);	// + Fiks
	self.addKey(70/*0106*/,1);	// Alf
	self.addKey(70,0);	// release Alf
	self.addKey(71,0);	// release Fiks
	}
	
 this.setGraf = function() { 
	self.addKey(71/*0107*/,1);	// + Fiks	
	self.addKey(54/*0066*/,1);	// ГРАФ (Graf)
	self.addKey(54,0);	// release Graf
	self.addKey(71,0);	// release Fiks
	}
 this.homeCtrl = function() { 
	fHomeCtrl^=1;
	self.addKey(71/*0107*/,1);	// + Fiks	
	self.addKey(54/*0066*/,1);	// ГРАФ (Graf)
	self.addKey(54,0);	// release Graf
	self.addKey(71,0);	// release Fiks
	}
	
// definition helpers
 function d(cd)
 {
   if(typeof(self.keymap[cd])=="undefined") {
   
    self.keymap[cd] = {
    lat:0,			// Lat
	lat_shift:0,	// Lat + shift pressed
	rus:0,			// Rus (same for shift)
	ctrl:0,			// УПР or СУ (Ctrl) + key cases		,but Both reside on Left Alt!
	ap2:0,			// АР2 (Ap2) + key cases 			,but Both reside on Left Alt!
	AltFunc:0		// or simply LeftAlt+keycode
    };
   }
   return self.keymap[cd];
 }
 
  /* html keycode, Lat, Lat+with shift pressed */  
 function lat(cd,L,U)	// lat
 {
  var O = d(cd);  O.lat = L; O.lat_shift = U;
 }
 
 /* html keycode, Lat */  
 function lats(cd,uknc) { lat(cd,uknc,uknc) }	// lat same

 
  /* html keycode, Rus */  
 function rus(cd,L)	// rus
 {
  var O = d(cd); O.rus = L;
 }

 // On LeftAlt, to allow process or not. Processes ROM subroutines.
 function ctrl(cd,ctrl) {
  var O = d(cd); O.ctrl = 1;
 }
 
 // not used, but can be
 function ap2(cd,ap2) {
  var O = d(cd); O.ap2 = 1;
 }
 
  // LeftAlt+key code cases
 function AltK(cd,code) {
  var O = d(cd); O.AltFunc = code;
 }
 
 function init()
 {
	
  /*cuken on querty mapping*/

  var m=[190/*ю*/,70/*а*/,188/*б*/,87/*ц*/,76/*д*/,
  84/*е*/,65/*ф*/,85/*г*/,219/*х*/,66/*и*/,81/*й*/,82/*к*/,
   75/*л*/,86/*м*/,89/*н*/,74/*о*/,71/*п*/,90/*я*/,72/*р*/,
   67/*с*/,78/*т*/,69/*у*/,186/*ж*/,68/*в*/,
   77/*ь*/,83/*ы*/,80/*з*/,73/*ш*/,222/*э*/,
   79/*щ*/,88/*ч*/,221/*ъ*/,192/*ё*/];
   
   /* uknc code */
  var u=[63/*0077 ю*/,58/*0072 а*/,62/*0076 б*/,40/*0050 ц*/,47/*0057 д*/,
  27/*0033 е*/,39/*0047 ф*/,45/*0055 г*/,110/*0156 х*/,59/*0073 и*/,23/*0027 й*/,42/*0052 к*/,
   46/*0056 л*/,74/*0112 м*/,44/*0054 н*/,61/*0075 о*/,43/*0053 п*/,55/*0067 я*/,60/*0074 р*/,
   73/*0111 с*/,76/*0114 т*/,41/*0051 у*/,95/*0137 ж*/,57/*0071 в*/,
   77/*0115 ь*/,56/*0070 ы*/,111/*0157 з*/,30/*0036 ш*/,94/*0136 э*/,
   31/*0037 щ*/,72/*0110 ч*/,2109/*0155 ъ*/,0/*ё*/];

   //33=PgUp,34=PgDn,35=End,36=Home
   //45=Ins,46=Del
   
		// this for games mostly, pure code by press
  lats(36/*Home*/, 122);		// ПС or ПОМ
	
  lats(37/*Left*/, 78 /*0116*/);
  lats(38/*Up*/, 108 /*0154*/);
  lats(39/*Right*/,91 /*0133*/);
  lats(40/*Down*/, 92 /*0134*/);

  lat(49/*1*/,24 /*0030*/,24/*!*/);
  lat(50/*2*/,25 /*0031*/,1063/*@*/);
  lat(51/*3*/,26 /*0032*/,26/*#*/);
  lat(52/*4*/,11 /*0013*/,11/*$*/);
  lat(53/*5*/,28 /*0034*/,28/*%*/);
  lat(54/*6*/,29 /*0035*/,1072/*^*/);
  lat(55/*7*/,14 /*0016*/,29/*&*/);
  lat(56/*8*/,15 /*0017*/,124/*asterisk*/);
  lat(57/*9*/,127 /*0177*/,15/*(*/);
  lat(48/*0*/,126 /*0176*/,127/*)*/);

  lat(8/*Backspace*/,1218/*BS*/, 2109);
  lats(9/*Tab*/,150/*TAB*/);
  
  //16=Shift,17=Ctrl,18=Alt,,20=CapsLock,
  
   /* 19=Pause,Break, 27=ESC */
  lats(19, 2121);		// clear screen
  lats(27, 4);			// STOP

  // Graf 0066
  lats(13/*Enter*/, 107 /*0153*/); 
  lats(32/*Space*/, 75 /*0113*/);
  
  lats(65/*A*/, 58 /*0072*/); lats(66/*B*/, 62 /*0076*/); lats(67/*C*/, 40 /*0050*/);
  lats(68/*D*/, 47 /*0057*/); lats(69/*E*/, 27 /*0033*/); lats(70/*F*/, 39 /*0047*/);
  lats(71/*G*/, 45 /*0055*/); lats(72/*H*/, 110 /*0156*/); lats(73/*I*/, 59 /*0073*/);
  lats(74/*J*/, 23 /*0027*/); lats(75/*K*/, 42 /*0052*/); lats(76/*L*/, 46 /*0056*/);
  lats(77/*M*/, 74 /*0112*/); lats(78/*N*/, 44 /*0054*/); lats(79/*O*/, 61 /*0075*/);
  lats(80/*P*/, 43 /*0053*/); lats(81/*Q*/, 55 /*0067*/); lats(82/*R*/, 60 /*0074*/);
  lats(83/*S*/, 73 /*0111*/); lats(84/*T*/, 76 /*0114*/); lats(85/*U*/, 41 /*0051*/);
  lats(86/*V*/, 95 /*0137*/); lats(87/*W*/, 57 /*0071*/); lats(88/*X*/, 77 /*0115*/);
  lats(89/*Y*/, 56 /*0070*/); lats(90/*Z*/, 111 /*0157*/);

   //44=PrntScrn,45=Insert,46=Delete
   //91=WIN Key Start, 93=WIN Menu
   //144=NumLock, 145=ScrollLock
   
  lat(188,1207/*,*/,2207/*<*/);
  lat(190,102/*.*/,93/*>*/);
  lat(191,123/*slash*/,123/*?*/);
  lat(192,2068/*`*/,2200/*~*/);
  lat(219,1030/*[*/,30/*{*/);
  lat(220,94/*bk-slash*/,2222/*|*/);
  lat(221,1031/*]*/,31/*}*/);
  lat(222,2014/*'*/,25/*"*/);

  lat(186,7/*;*/,1/*:*/);
  lat(187,2253/*=*/,2007/*+*/);
  lat(189,2002/*-*/,1109/*_*/);

if(navigator.userAgent.indexOf("Firefox") >= 0)
  {
  lat(59,7/*;*/,1/*:*/);
  lat(61,2253/*=*/,2007/*+*/);
  lat(173,2002/*-*/,1109/*_*/);
  }
  
	/* F1-F5, and Shift+F1-F5 get F6-F10 */
  lat(112/*F1*/,8/*010 K1*/,2008/*010 K6*/);
  lat(113/*F2*/,9/*011 K2*/,2009/*010 K7*/);
  lat(114/*F3*/,10/*012 K3*/,2010/*010 K8*/);
  lat(115/*F4*/,12/*014 K4*/,2012/*010 K9*/);
  lat(116/*F5*/,13/*015 K5*/,2013/*010 K10*/);
  
  // left for debugger
  // 117=F6, 118=F7(Step), 119=F8(StepOver),
  //  120=F9(Stop), 121=F10 (Run)

  lat(122/*F11*/,106/* KOM or УСТ */,1105/* ИСП ISP */);
  lats(123/*F12*/,10000/*Reset*/);
  
  ctrl(71/*Ctrl+G*/); // Bell
  ctrl(73/*Ctrl+I*/);	// TAB
  ctrl(74/*Ctrl+J*/);	// LF
  ctrl(77/*Ctrl+M*/);	// CR return
  ctrl(78/*Ctrl+N*/); // RUS
  ctrl(79/*Ctrl+O*/); // LAT
  ctrl(76/*Ctrl+L*/);	// Clear screen
  
  // Alt+1..0 = F1...F10
  AltK(49/*1*/,8/*010 K1*/);
  AltK(50/*2*/,9/*011 K2*/);
  AltK(51/*3*/,10/*012 K3*/);
  AltK(52/*4*/,12/*014 K4*/);
  AltK(53/*5*/,13/*015 K5*/);
  AltK(54/*6*/,2008/*010 K6*/);
  AltK(55/*7*/,2009/*011 K7*/);
  AltK(56/*8*/,2010/*012 K8*/);
  AltK(57/*9*/,2012/*014 K9*/);
  AltK(48/*0*/,2013/*015 K10*/);
  
  AltK(122/*F11*/,122);	// on Alt ПОМ  
  
  /* cyrillic*/
  for(var i=0;i<32;i++) rus(m[i], u[i]);		// without ё
  
	/* Numpad */
 lats(96,126);	// 0 NumPad
 lats(97,24);	// 1 NumPad
 lats(98,25);	// 2 NumPad
 lats(99,26);	// 3 NumPad
 lats(100,11);	// 4 NumPad
 lats(101,28);	// 5 NumPad
 lats(102,29);	// 6 NumPad
 lats(103,14);	// 7 NumPad
 lats(104,15);	// 8 NumPad
 lats(105,127);	// 9 NumPad

 lats(110,102);		// . NumPad
 lats(107,2007);	// + NumPad
 lats(13,107);		// Enter  NumPad

 lats(111,94);		// / NumPad
 lats(106,2124);	// * NumPad
 lats(109,2002);	// - Numpad

	// ToDo: Uknc key:  0005, "," NumPad
 }
 
init();

 this.reset = function() {
  subst_keys = [];			// clear on reset
  touch_subst_keys = [];	// in Touches.js
  keyspressed = [];
 }

	// read table substitute on press, release 

 this.getMappedKey = function(key,shift,alt) {
  
  var keycode = -1;
  
  if(typeof(self.keymap[key])!=="undefined") {
  
  var o = self.keymap[key];

  
		// read keyboard register
  var keyReg = Board.GetKeyboardRegister();
  rusAlf = ((keyReg & KEYB.RUS)!=0);		// is the Rus table set or not?
  capsLocked = ((keyReg & KEYB.LOWERREG)!=0);	// is the low case table set?
	
		// Left Alt case for both
  if(alt && o.ctrl) {
	keycode = 4000+o.lat;	/* (УПР or СУ +... special) */
	}	
  else if(alt && o.ap2) {
	keycode = 5000+o.lat;	/* (AR2+... special) */
	}
  else if(alt && o.AltFunc) {
	keycode = o.AltFunc;	/* (Alt+...) for functional cases*/
	}
  else	// other
	{
	keycode = ( rusAlf ? o.rus : (!shift ? o.lat : o.lat_shift) );
	}
  }
  return keycode;
 }

 
	// validation, can avoid keypress or set other action on it
	
  function /*int*/translateKey(/*KeyEvent*/ e)
  {
    var /*int*/key = e.keyCode || e.which;

	/* validation */
	
    switch (key)
    {
    case 16: /*Shift*/
	 if(e.location==2) self.addKey(69,1);	/* Right shift is with code */
     return -1;
    case 17: /*Ctrl*/
	  if(e.location==2) self.setAlf();	/* Right Ctrl is Alf (LAT/RUS swap) with Fiks */
	  return -1;
    case 18: /*Alt*/
	  return -1
    case 20:
      self.Capsed();
      return -1;
	case 45:
      self.setGraf();		/* Insert sets Graf */
      return -1;
	case 46:/*Del*/
      self.addKey(71,1);self.addKey(71,0);		// Del = ФИКС (Fiks)
      return -1;
	case 33:/*PgUp*/
      self.addKey(70,1);self.addKey(70,0);		// Alf (without fiks)
      return -1;
	case 34:/*PgDn*/	
      self.addKey(54,1);self.addKey(54,0);		// Graf (without fiks)
      return -1;
	case 35:/*End*/		
      self.addKey(69,1);self.addKey(69,0);			// Shift short press
      return -1;
	case 123: /*F12*/
	  reset = (++reset)%2;
	  if(reset==2) Board.Reset();		// not needed, but works ok too
	  else {
		Board.LoadFromImage( (reset==1 ? UkncZagruzka : UkncBasic),1 );
		}
	  scr.DRAW();
      return -1;
    }
    
	/* same key as on release */
	
    key = self.getMappedKey(key, e.shiftKey||capsLocked, e.altKey);
    
    if (key < 0) return -1;
	
	var k2 = parseInt(key/1000);
	var code = key % 1000;
	
					/* Alt+key group */
	if(k2==4) {
		self.addKey(38,1);	// ctrl (УПР or СУ)
		self.addKey(code,1);	// + key
		self.addKey(code,0);	// release key
		self.addKey(38,0);	// release ctrl
		}
		
	if(k2==5) {
		self.addKey(27,1);	// ap2 (Ap2)
		self.addKey(code,1);	// + key
		self.addKey(code,0);	// release key
		self.addKey(27,0);	// release ap2
		}
	
		// some keys as @ accessible without upper-case key pressed (shift)
		// 1xxx - should ignore shift
		// 2xxx - should add shift
	if( ((k2==0 && e.shiftKey)) || k2==2 ) {
		self.addKey(69,1);	// shift
		if(code!=69) self.addKey(code,1);	// + key
		if(code!=69) self.addKey(code,0);	// release key
		self.addKey(69,0);	// release shift
		return -1;
		}
		
    return key;
  }

 
this.keyHit = function(e) {

  var /*int*/k = e.keyCode || e.which;

  for(var j=0; j<subst_keys.length; j++) {
	var Sb = subst_keys[j];
	if( Sb.f == k ) { self.addKey(Sb.uknc,1); break; }
	}
  
  var /*int*/key = translateKey(e);
  
  if (key <= 0) return -1;
  
  key %=1000;	// remove flag part

  if(keysbuffer.length<3)
		self.addKey(key,1);
}

this.keyRelease = function(e) {

  var /*int*/k = e.keyCode || e.which;
  
  for(var j=0; j<subst_keys.length; j++) {
	var Sb = subst_keys[j];
	if( Sb.f == k ) { self.addKey(Sb.uknc,0); break; }
	}
	
  var key = self.getMappedKey(k, e.shiftKey||capsLocked, e.altKey);
    
  if (key <= 0) return -1;
	
  key %=1000;	// remove flag part
  self.addKey(key,0);	// release key
}

// Called from Board loops

this.processNextKey = function() {
	
	if(keysbuffer.length) {			// process next keys - press it
		var K = keysbuffer.shift();
		

			var i = keyspressed.lastIndexOf(K.keycode);
			if((i<0) || ( K.pressed != keyspressed[i].pressed )) {
					Board.KeyboardEvent(K.keycode,K.pressed);
					lastKEY = K.keycode;
					keyspressed.push(K.keycode,K.pressed);
				}

		//keyspressed.push(K.keycode,K.pressed);
		//LOG(K.keycode + ' ' + K.pressed);
		}

}

// browser key substitute
this.Subst_Key = function( onekey, code ) {
	subst_keys.push( { f: onekey, uknc: code } );
}

	return this;
}
