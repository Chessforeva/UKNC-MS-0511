/*
	UKNC keyboard
  
	Notes on the keyboard mapping table.
	(remapped and replaced somehow, feels good for Basic editor)
	 
	The original keyboard "Cuken" differs much, so tried to make it "Querty"-friendly.

*/
  
Keyboard = function()
{
 var self = this;
 
 var /*boolean*/capsLocked = false;
 var /*boolean*/rusAlf = false;
  
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

 var charTb = 0;
 this.toSet = function(n) {
	var f=0, keyReg = Board.GetKeyboardRegister();
	if((keyReg & KEYB.GRAF)!=0) { self.setGraf(); f=1; }
	else {
		if(charTb==1 && (keyReg & KEYB.LAT)==0) { self.setAlf(); f=1; }
		if(charTb==2 && (keyReg & KEYB.RUS)==0) { self.setAlf(); f=1; }
		}
	if(f && (--n)) setTimeout('keyboard.toSet('+n+')',500);
	else charTb = 0;
 }
 
 this.setRus = function() {
	charTb = 2; self.toSet(4);
	}
	
 this.setLat = function() {
	charTb = 1; self.toSet(4);
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
  lats(45/*Insert*/, 4073);		// UPR+S
  lats(46/*Delete*/, 4076);		// UPR+T
  lats(36/*Home*/, 121);		// SBROS
  lats(35/*End*/, 4041);		// UPR+U
  
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
  lats(16, 69);		// shift
  lats(17, 38);		// ctrl
  
   /* 19=Pause,Break, 27=ESC */
  lats(19, 2121);		// clear screen
  lats(27, 4);			// STOP

  lat(13/*Enter*/, 107 /*0153*/, 4023); 
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
  
  AltK(122/*F11*/,122);	// on Alt ПОМ (or ПС)
  
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
	  self.addKey(38,1);
	  return -1;
    case 18: /*Alt*/
	  return -1
    case 20:	/* CAPS */
      self.Capsed();
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
					//LOG(K.keycode + ' ' + K.pressed);
				}
		}

}

// browser key substitute
this.Subst_Key = function( onekey, code ) {
	subst_keys.push( { f: onekey, uknc: code } );
}

	/* VIRTUAL KEYBOARD */

 var vkb = []; // Keyboard key mapping
 var uknc_scancd = [
	8 /*0010 K1*/, 9 /*0011 K2*/, 10 /*0012 K3*/, 12 /*0014 K4*/, 13 /*0015 K5*/,
	122 /*0172 POM*/, 106 /*0152 UST*/, 105 /*0151 ISP*/, 121 /*0171* SBROS (RESET)*/,4 /*0004 STOP*/,
	6 /*0006 AR2*/, 7 /*0007 ; + */, 24 /*0030 1 */, 25 /*0031* 2 */, 26 /*0032 3 */,
	11 /*0013 4 */, 28 /*0034 5 */, 29 /*0035 6 */, 14 /*0016 7 */, 15 /*0017 8 */,
	127 /*0177 9 */, 126 /*0176 0 */, 125 /*0175* - = */, 123 /*0173 / ? */, 90 /*0132 BS*/,
	22 /*0026 TAB*/, 23 /*0027 É J*/, 40 /*0050 Ö C*/, 41 /*0051 Ó U*/, 42 /*0052 Ź K*/,
	27 /*0033 Å E*/, 44 /*0054 Ķ N*/, 45 /*0055 Ć G*/, 30 /*0036 Ų [*/, 31 /*0037 Ł ]*/,
	111 /*0157 Ē Z*/, 110 /*0156 Õ H*/, 109 /*0155 Ś*/, 124 /*0174 : "*" */, 
	38 /*0046 UPR*/, 39 /*0047 Ō F*/, 56 /*0070 Ū Y*/, 57 /*0071 Ā W*/, 58 /*0072 Ą A*/,
	43 /*0053 Ļ P*/, 60 /*0074 Š R*/, 61 /*0075 Ī O*/, 46 /*0056 Ė L*/, 47 /*0057 Ä D*/,
	95 /*0137 Ę V*/, 94 /*0136 Ż Backslash*/, 93 /*0135 . ">" */,
	70 /*0106 ALF*/, 54 /*0066 GRAF*/, 55 /*0067 ß Q*/, 72 /*0110 × ^*/, 73 /*0111 Ń S*/, 
	74 /*0112 Ģ*/, 59 /*0073 Č I*/, 76 /*0114 Ņ*/, 77 /*0115 Ü X*/, 62 /*0076 Į B*/,
	63 /*0077 Ž @*/, 79 /*0117 , "<" */,
	69 /*0105 LShift */, 71 /*0107 FIKS*/, 75 /*0113 Space bar*/, 69 /*0105 RShift*/,
	78 /*0116 Left*/, 108 /*0154 Up*/, 92 /*0134 Down*/, 91 /*0133 Right*/,
	107 /*0153 ENTER*/,
	89 /*0131 + NumPad*/, 21 /*0025 - NP*/, 5 /*0005 "," NP*/,
	85 /*0125 7 NP*/, 101 /*0145 8 NP*/, 117 /*0165 9 NP*/,
	88 /*0130 4 NP*/,  104 /*0150 5 NP*/, 120 /*0170 6 NP*/,
	87 /*0127 1 NP*/, 103 /*0147 2 NP*/, 119 /*0167 3 NP*/,
	86 /*0126 0 NP*/, 102 /*0146 . NumPad*/, 118 /*0166 ENTER NumPad*/];
 
 this.getNumpadCodes = function() { return uknc_scancd.slice(73); }	// Last 15 codes
 
 function initVKB() {
	var p = [/*1 K1*/5,27,10,78,121,121,122,122,118,/*2 POM*/3,926,10,78,121,121,120,
	/*3 SBR*/2,1300,12,76,119,121,/*4 AP2*/14,23,99,78,80,82,81,80,82,82,79,82,80,80,80,83,80,81,
	/*5 BS*/1,1164,99,79,120,/*6 TAB*/14,21,180,77,121,82,81,81,80,82,79,83,80,81,82,80,81,82,
	/*7 UPR*/13,21,261,79,138,81,83,81,80,82,82,81,81,81,81,82,99,
	/*8 ALF*/12,18,341,81,100,83,83,80,80,83,83,81,82,80,82,98,/*9 LShift*/4,15,423,81,164,104,590,163,
	/*10 Arrows*/1,1040,344,160,82,/*11*/1,1122,345,78,81,/*12*/1,1122,424,80,83,/*13*/1,1204,344,160,83,
	/*14 Enter*/1,1152,186,157,126,/*15 Numpad*/3,1300,102,79,80,81,81,/*16*/3,1300,181,79,81,80,79,
	/*17*/3,1300,262,79,83,79,82,/*18*/3,1300,344,78,84,79,79,/*19*/3,1300,424,77,84,80,81];
	
	var i=0,j=0;
	while(i<p.length) {
		var c = p[i++], X = p[i++], Y = p[i++], dY = p[i++];
		while(c--) {
			var X1 = X+p[i++], Y1 = Y+dY;
			vkb.push({ x0:X, y0:Y, x1:X1, y1:Y1, i:j, cd:uknc_scancd[j++] });
			X=X1;
		}
	}
 }
 
  this.holdkey = function(o) {
	return (( (o.cd==6) /*AR2*/ || (o.cd==38) /*UPR*/ || (o.cd==70) /*ALF*/ ||
		(o.cd==54)/*GRAF*/ || (o.cd==69 && o.i==64) /*LShift*/ || (o.cd==71) /*FIKS*/ ) ? o.cd : 0);
  }

 
  this.getVKey = function(x,y) {
	for(var i=0; i<88; i++) {
		var o = vkb[i];
		if((o.x0+3)<x && (o.x1-3)>x && (o.y0+3)<y && (o.y1-3)>y) return vkb[i];
	}
	return null;
  }


	initVKB();
	
	return this;
}
