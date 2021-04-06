/*

	Display functions
	UKNC screen is 640 x 288,  with a each-row-addressing with parameters.
	Not a simplest video memory copying. Therefore is this SC object for faster updating.
	SC is 307 rows x (640 px columns)
	RAM[0],[1],[2] byte holds [R,G,B] for 8 pixels, good for putImageData
	
*/

Px = [];		// Global cache array for changed memory addresses
Px_ = 0;		// for fast check, is there screen caching allowed in Px[]

Screen = function() {

	var self = this;
	
	function Rgb32( Cols ) {
		var Arr = [];
		for( var i=0; i<128; i++ ) {
			var RGB = Cols[i];
			var B = RGB & 255;
			var G = (RGB>>>8) & 255;
			var R = (RGB>>>16) & 255;
			Arr.push( [R,G,B] );			
		}
		return Arr;
	}
	
/*
yrgb  R   G   B  0xRRGGBB
0000 000 000 000 0x000000
0001 000 000 128 0x000080
0010 000 128 000 0x008000
0011 000 128 128 0x008080
0100 128 000 000 0x800000
0101 128 000 128 0x800080
0110 128 128 000 0x808000
0111 128 128 128 0x808080
1000 000 000 000 0x000000
1001 000 000 255 0x0000FF
1010 000 255 000 0x00FF00
1011 000 255 255 0x00FFFF
1100 255 000 000 0xFF0000
1101 255 000 255 0xFF00FF
1110 255 255 000 0xFFFF00
1111 255 255 255 0xFFFFFF
*/

// Table for color conversion yrgb (4 bits) -> DWORD (32 bits)


var StandardRGBColors = Rgb32( [ /*16 x 8 */
    0, 0x000080, 0x008000, 0x008080, 0x800000, 0x800080, 0x808000, 0x808080,
    0, 0x0000FF, 0x00FF00, 0x00FFFF, 0xFF0000, 0xFF00FF, 0xFFFF00, 0xFFFFFF,
    0, 0x000060, 0x008000, 0x008060, 0x800000, 0x800060, 0x808000, 0x808060,
    0, 0x0000DF, 0x00FF00, 0x00FFDF, 0xFF0000, 0xFF00DF, 0xFFFF00, 0xFFFFDF,
    0, 0x000080, 0x006000, 0x006080, 0x800000, 0x800080, 0x806000, 0x806080,
    0, 0x0000FF, 0x00DF00, 0x00DFFF, 0xFF0000, 0xFF00FF, 0xFFDF00, 0xFFDFFF,
    0, 0x000060, 0x006000, 0x006060, 0x800000, 0x800060, 0x806000, 0x806060,
    0, 0x0000DF, 0x00DF00, 0x00DFDF, 0xFF0000, 0xFF00DF, 0xFFDF00, 0xFFDFDF,
    0, 0x000080, 0x008000, 0x008080, 0x600000, 0x600080, 0x608000, 0x608080,
    0, 0x0000FF, 0x00FF00, 0x00FFFF, 0xDF0000, 0xDF00FF, 0xDFFF00, 0xDFFFFF,
    0, 0x000060, 0x008000, 0x008060, 0x600000, 0x600060, 0x608000, 0x608060,
    0, 0x0000DF, 0x00FF00, 0x00FFDF, 0xDF0000, 0xDF00DF, 0xDFFF00, 0xDFFFDF,
    0, 0x000080, 0x006000, 0x006080, 0x600000, 0x600080, 0x606000, 0x606080,
    0, 0x0000FF, 0x00DF00, 0x00DFFF, 0xDF0000, 0xDF00FF, 0xDFDF00, 0xDFDFFF,
    0, 0x000060, 0x006000, 0x006060, 0x600000, 0x600060, 0x606000, 0x606060,
    0, 0x0000DF, 0x00DF00, 0x00DFDF, 0xDF0000, 0xDF00DF, 0xDFDF00, 0xDFDFDF
] );

var StandardGRBColors = Rgb32( [ /*16 x 8 */
    0, 0x000080, 0x800000, 0x800080, 0x008000, 0x008080, 0x808000, 0x808080,
    0, 0x0000FF, 0xFF0000, 0xFF00FF, 0x00FF00, 0x00FFFF, 0xFFFF00, 0xFFFFFF,
    0, 0x000060, 0x800000, 0x800060, 0x008000, 0x008060, 0x808000, 0x808060,
    0, 0x0000DF, 0xFF0000, 0xFF00DF, 0x00FF00, 0x00FFDF, 0xFFFF00, 0xFFFFDF,
    0, 0x000080, 0x600000, 0x600080, 0x008000, 0x008080, 0x608000, 0x608080,
    0, 0x0000FF, 0xDF0000, 0xDF00FF, 0x00FF00, 0x00FFFF, 0xDFFF00, 0xDFFFFF,
    0, 0x000060, 0x600000, 0x600060, 0x008000, 0x008060, 0x608000, 0x608060,
    0, 0x0000DF, 0xDF0000, 0xDF00DF, 0x00FF00, 0x00FFDF, 0xDFFF00, 0xDFFFDF,
    0, 0x000080, 0x800000, 0x800080, 0x006000, 0x006080, 0x806000, 0x806080,
    0, 0x0000FF, 0xFF0000, 0xFF00FF, 0x00DF00, 0x00DFFF, 0xFFDF00, 0xFFDFFF,
    0, 0x000060, 0x800000, 0x800060, 0x006000, 0x006060, 0x806000, 0x806060,
    0, 0x0000DF, 0xFF0000, 0xFF00DF, 0x00DF00, 0x00DFDF, 0xFFDF00, 0xFFDFDF,
    0, 0x000080, 0x600000, 0x600080, 0x006000, 0x006080, 0x606000, 0x606080,
    0, 0x0000FF, 0xDF0000, 0xDF00FF, 0x00DF00, 0x00DFFF, 0xDFDF00, 0xDFDFFF,
    0, 0x000060, 0x600000, 0x600060, 0x006000, 0x006060, 0x606000, 0x606060,
    0, 0x0000DF, 0xDF0000, 0xDF00DF, 0x00DF00, 0x00DFDF, 0xDFDF00, 0xDFDFDF
] );

var DarkRGBColors = Rgb32( [ /*16 x 8 */
    0, 0x000060, 0x006000, 0x006060, 0x600000, 0x600060, 0x606000, 0x606060,
    0, 0x0000CF, 0x00CF00, 0x00CFCF, 0xCF0000, 0xCF00CF, 0xCFCF00, 0xCFCFCF,
    0, 0x000048, 0x006000, 0x006048, 0x600000, 0x600048, 0x606000, 0x606048,
    0, 0x00009F, 0x00CF00, 0x00CF9F, 0xCF0000, 0xCF009F, 0xCFCF00, 0xCFCF9F,
    0, 0x000060, 0x004800, 0x004860, 0x600000, 0x600060, 0x604800, 0x604860,
    0, 0x0000CF, 0x009F00, 0x00DCFF, 0xCF0000, 0xCF00CF, 0xCF9F00, 0xCFDCFF,
    0, 0x000048, 0x004800, 0x004848, 0x600000, 0x600048, 0x604800, 0x604848,
    0, 0x00009F, 0x009F00, 0x009F9F, 0xCF0000, 0xCF009F, 0xCF9F00, 0xCF9F9F,
    0, 0x000060, 0x006000, 0x006060, 0x480000, 0x480060, 0x486000, 0x486060,
    0, 0x0000CF, 0x00CF00, 0x00CFCF, 0x9F0000, 0x9F00CF, 0xDCFF00, 0xDCFCFF,
    0, 0x000048, 0x006000, 0x006048, 0x480000, 0x480048, 0x486000, 0x486048,
    0, 0x00009F, 0x00CF00, 0x00CF9F, 0x9F0000, 0x9F009F, 0xDCFF00, 0xDCFF9F,
    0, 0x000060, 0x004800, 0x004860, 0x480000, 0x480060, 0x484800, 0x484860,
    0, 0x0000CF, 0x009F00, 0x00DCFF, 0x9F0000, 0x9F00CF, 0x9F9F00, 0x9FDCFF,
    0, 0x000048, 0x004800, 0x004848, 0x480000, 0x480048, 0x484800, 0x484848,
    0, 0x00009F, 0x009F00, 0x009F9F, 0x9F0000, 0x9F009F, 0x9F9F00, 0x9F9F9F
] );

	function copy8( arr ) {
		for(var i=1;i<16;i++)
			for(var j=0;j<8;j++)
				arr[(i<<3)|j] = arr[j];
		return arr;
	}	
// Table for color conversion, gray (black and white) display
var GrayColors = Rgb32( /*16 x 8 */ copy8(
	[ 0, 0x242424, 0x484848, 0x6C6C6C, 0x909090, 0xB4B4B4, 0xD8D8D8, 0xFFFFFF
] ));

  this.setCol = function(scheme) {
	switch(scheme) {
	case 0: colors = StandardRGBColors; break;
	case 1: colors = StandardGRBColors; break;
	case 2: colors = DarkRGBColors; break;
	case 3: colors = GrayColors; break;
	}
	self.colscheme = scheme;
  }
  
  var colors = StandardRGBColors;
  this.colscheme = 0;  

	var CS,CX,gDATA;
  
	var SC = { row:[], redraw:true };	// [307]	rows of [640] cols of screen data
	
this.init = function() {

	CS = GE("UKNC_canvas");
	CX = CS.getContext('2d');
	gDATA = CX.getImageData(0, 0, 640, 288);	// get UKNC screen once
	
	for(var i=0; i<307; i++) {
	
		SC.row[i] = {		// simply save each row main data for fast update
			y: i,
			scale:0, cYRGB:0, cType:false, cPos:0, cOn:0, cAddr:0,
			pal8:[0,0,0,0,0,0,0,0],		// [8]
			col:[]
		};
		
		var O = SC.row[i];
		
		for(var j=0;j<640;j++) {		// save data of each column pixel  
			
			O.col[j] = {
				x: j,
				row: O,					// the root object for each pixel in a row
				a:0, p:0, k:0, b0:0, b1:0, b2:0
			};
		}
	}
}
  

function Scan()		// Redraw all screen
{
	var k = 0;		// Canvas pixel colours position counter 4 * 640 * 288
	
	SC.redraw = false; Px = []; Px_ = 1;

    // Tag parsing loop
    var /*BYTE*/ cursorYRGB = 0;
    var /*bool*/ okCursorType = false;
    var /*BYTE*/ cursorPos = 128;
    var /*bool*/ cursorOn = false;
    var /*BYTE*/ cursorAddress = 0;  // Address of graphical cursor
    var /*WORD*/ address = 184; /*0000270*/  // Tag sequence start address (UKNC constant fixed)
    var /*bool*/ okTagSize = false;  // Tag size: TRUE - 4-word, false - 2-word (first tag is always 2-word)
    var /*bool*/ okTagType = false;  // Type of 4-word tag: TRUE - set palette, false - set params
    var /*int*/ scale = 1;           // Horizontal scale: 1, 2, 4, or 8
    var /*DWORD*/ palette = 0;       // Palette
	 // [8] Current palette; update each time we change the "palette" variable
    var /*DWORD*/ palettecurrent = memset([], [0,0,0], 8);
    var /*BYTE*/ pbpgpr = 0;         // 3-bit Y-value modifier
    for (var /*int*/ yy = 0; yy < 307; yy++)
    {
		var O = SC.row[yy];
	
        if (okTagSize)  // 4-word tag
        {
            var /*WORD*/ tag1 = Board.GetRAMWord(0, address);
			if(Px_) Px[address] = { row: O, col:0, T: 0, v: tag1 };
            address += 2;
            var /*WORD*/ tag2 = Board.GetRAMWord(0, address);
			if(Px_) Px[address] = { row: O, col:0, T: 1, v: tag2 };
            address += 2;

            if (okTagType)  // 4-word palette tag
            {
                palette = ((tag2<<16)|tag1); //MAKELONG
            }
            else  // 4-word params tag
            {
                scale = (tag2 >>> 4) & 3;  // Bits 4-5 - new scale value
                pbpgpr = /*(BYTE)*/((7 - (tag2 & 7)) << 4);  // Y-value modifier
                cursorYRGB = /*(BYTE)*/(tag1 & 15);  // Cursor color
                okCursorType = ((tag1 & 16) != 0);  // true - graphical cursor, false - symbolic cursor
                cursorPos = /*(BYTE)*/(((tag1 >> 8) >> scale) & 0x7f);  // Cursor position in the line
                cursorAddress = /*(BYTE)*/((tag1 >> 5) & 7);
                scale = 1 << scale;
            }

			
			for (var /*BYTE*/ c = 0; c < 8; c++)  // Update palettecurrent
				{
				var /*BYTE*/ valueYRGB = /*(BYTE)*/ (palette >>> (c << 2)) & 15;
				palettecurrent[c] = colors[pbpgpr | valueYRGB];		// changes through line scan
				}
			O.pal8 = palettecurrent.slice();

        }
			//addressBits
        var /*WORD*/ a = Board.GetRAMWord(0, address);  // The word before the last word - is address of bits from all three memory planes
		if(Px_) Px[address] = { row: O, col:0, T: 2, v: a };
		address += 2;

        // Calculate size, type and address of the next tag
        var /*WORD*/ tagB = Board.GetRAMWord(0, address);  // Last word of the tag - is address and type of the next tag
        okTagSize = ((tagB & 2) != 0);  // Bit 1 shows size of the next tag
		if(Px_) Px[address] = { row: O, col:0, T: 3, v: tagB };
		
        if (okTagSize)
        {
            address = tagB & (~7);
            okTagType = ((tagB & 4) != 0);  // Bit 2 shows type of the next tag
        }
        else
            address = tagB & (~3);
        if ((tagB & 1) != 0)
            cursorOn = !cursorOn;

        // Draw bits into the bitmap, from line 20 to line 307
        if (yy < 19) continue;
			

        // Loop through bits from addressBits, planes 0,1,2
        // For each pixel:
        //   Get bit from planes 0,1,2 and make value
        //   Map value to palette; result is 4-bit value YRGB
        //   Translate value to 24-bit RGB
        //   Put bits value; repeat using scale value

		if(Px_) {
			O.scale = scale;
			O.cYRGB = cursorYRGB;
			O.cType = okCursorType;
			O.cPos = cursorPos;
			O.cOn = cursorOn;
			O.cAddr = cursorAddress;	
			}
			
        var /*int*/ x = 640, p = 0, /*DWORD*/ C;
		
        while(x>0)
        {
            // Get bit from planes 0,1,2
            var b0 = RAM[0][a], b1 = RAM[1][a], b2 = RAM[2][a];
			
            // Loop through the bits of the byte
           
		    var Q = O.col[p];
			Q.a = a;
			Q.k = k;
			Q.p = p;
			Q.b0 = b0;
			Q.b1 = b1;
			Q.b2 = b2;
			
			// Should redraw all, if there are same pixels in various rows.
			// one Px address = known 8 pixels
			if(typeof(Px[a])!=="undefined") Px_=0;	// if should redraw all

			if(Px_) Px[a] = { row: O, col: Q, T: 4, v:0 };
			
		   // scan 8 bits
            for (var b=0; b<8; b++ )
            {
                if (cursorOn && (p == cursorPos) && (!okCursorType || (okCursorType && (b == cursorAddress))))
                    C = colors[cursorYRGB];  // 4-bit to 32-bit color
                else
                {
                    // Make 3-bit value from the bits
                    var /*BYTE*/ v = (b0 & 1) | ((b1 & 1) << 1) | ((b2 & 1) << 2);
                    C = palettecurrent[v];  // 3-bit to 32-bit color
                }
				
                var j = scale;		
                while((j--)>0) {
					gDATA.data[k++] = C[0];
					gDATA.data[k++] = C[1];
					gDATA.data[k++] = C[2];
					gDATA.data[k++] = 255;
                }


                x -= scale;

                // Shift to the next bit
                b0 >>= 1;b1 >>= 1;b2 >>= 1;
            }
			
            // xr <= 0  is end of line
 
            a++;  // Go to the next byte
            p++;
        }
    }
	
	if(!Px_) {
		SC.redraw = true; Px = [];		// clear, can not cache
		}
	
	CX.putImageData(gDATA,0, 0);	// copy to canvas
}

  
 this.update = function( addr)
  {
	var o = Px[addr];

	if(o.T<4) {
				// if address table updated (T=0,1 - tags, 2,3-addresses
				// then should redraw and recalculate all screen once again
		var data = Board.GetRAMWord(0, addr);
		if(data != o.v) {
				SC.redraw = true; Px_ = 0; // redraw all, slow
					// fxmpl, game Knight scrolls screen by swapping bit addresses, too much to cache
			}
		}
	else
		// only when changed some pixels, use prepared row table data
		// Some games copy pixels only to known RAM, old-school way, fxmpl. Arkanoid
		{
			// update pixels
			
			var O = o.row, Q = o.col;
			var k = Q.k, p = Q.p;
			var /*DWORD*/ C;
			
            // Get bit from planes 0,1,2
            var b0 = RAM[0][Q.a], b1 = RAM[1][Q.a], b2 = RAM[2][Q.a];
			
            // Loop through the bits of the byte
		   // scan 8 bits
            for ( var b=0; b<8; b++ )
            {
                if (O.cOn && (Q.p == O.cPos) && (!O.cType || (O.cType && (b == O.cAddr))))
                    C = colors[O.cYRGB];  // 4-bit to 32-bit color
                else
                {
                    // Make 3-bit value from the bits
                    var /*BYTE*/ v = (b0 & 1) | ((b1 & 1) << 1) | ((b2 & 1) << 2);
                    C = O.pal8[v];  // 3-bit to 32-bit color
                }
					
                var j = O.scale;		
                while((j--)>0) {
					gDATA.data[k++] = C[0];
					gDATA.data[k++] = C[1];
					gDATA.data[k++] = C[2];
					gDATA.data[k++] = 255;
                }

                // Shift to the next bit
                b0 >>= 1;b1 >>= 1;b2 >>= 1;
            }

        }
 
  }
  
this.fastDRAW = function ()
  {
  if(speed.Optimize==0 || SC.redraw) Scan();
  else {
	CX.putImageData(gDATA,0, 0);	//copy to canvas
	}
  }
  
 
this.DRAW = function()
  { 
  Scan();
  }	

	return this;
}
