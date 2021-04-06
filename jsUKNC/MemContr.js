
// Memory management functions

// Global outside class, easier to access

var Port = {
	/*uint16_t*/
	NetStation:0,  // Network station number
	o176560:0,  // Network receiver state
	o176562:0,  // Network receiver data (bits 0-7)
	o176564:0,  // Network translator state
	o176566:0,  // Network translator data (bits 0-7)
	o176640:0,  // Plane address register
	o176642:0,  // Plane 1 & 2 data register
	o176644:0,
	o176646:0,
	o176570:0,  // RS-232 receiver state
	o176572:0,  // RS-232 receiver data (bits 0-7)
	o176574:0,  // RS-232 translator state
	o176576:0,  // RS-232 translator data (bits 0-7)
	
	o177010:0,  // Plane address register
	o177012:0,  // Plane 0 data register
	o177014:0,  // Plane 1 & 2 data register

	o177026:0,  // Plane mask
	o177024:0,  // SpriteByte
	o177020:0,  // Background color 1
	o177022:0,  // Background color 2
	o177016:0,  // Pixel Color

	o177700:0,  // Keyboard status
	o177702:0,  // Keyboard data
	o177716:0,  // System control register

	o177054:0,  // address space control

    /*uint8_t*/
	o177100:0,  // i8255 port A -- Parallel port output data
	o177101:0,  // i8255 port B
	o177102:0	// i8255 port C
	
	// port o177710 = Timer.flags
	// port o177712 = Timer.reload
	// port o177714 = Timer.Tick
	
};


//------------------------------- Basis for Memory Controllers
// Memory controller classes implementation 
// Same for both sub-classes, the same things
//  Which:
// 0-first (CPU), 1-second (PPU)  of memory controller definition
//
// fview - should be "true" in views, "false" when processor runs
//	
MemoryController = function( Which ) {		// ::MemoryController

var self = this; 

var PU;   // PU attached (CPU or PPU)

var offset = 0;		// TA result

function /*void*/ AttachDevices(/*CBusDevice*/ Devices)
{

    Devices[0] = null;
    DeviceCount = deviceCount;

}

//
// dbg case, no ports
// both CPU and PPU
//
/*uint16_t*/ this.GetWord00 = function(/*uint16_t*/ address, /*bool*/ fview)
{
    switch (self.TA(address, fview))
    {
    case ADDRTYPE.RAM0:
		return Board.GetRAMWord(0,offset);
    case ADDRTYPE.RAM1:
		return Board.GetRAMWord(1, offset);
    case ADDRTYPE.RAM2:
		return Board.GetRAMWord(2, offset);
    case ADDRTYPE.RAM12:		//combined
		var j = offset>>>1;
		return MAKEWORD( Board.GetRAMByte(1, j), Board.GetRAMByte(2, j) );
    case ADDRTYPE.ROMCART1:
        return Board.GetROMCartWord(1, offset);
    case ADDRTYPE.ROMCART2:
        return Board.GetROMCartWord(2, offset);
    case ADDRTYPE.ROM:
        return Board.GetROMWord(offset);
    case ADDRTYPE.IO:
        return 0;
    case ADDRTYPE.DENY:
        return 0;
    }
    return 0;
}

// both CPU and PPU
/*uint16_t*/ this.GetWord = function(/*uint16_t*/ address, /*bool*/ fview)
{
    switch (self.TA(address, fview))
    {
    case ADDRTYPE.RAM0:			//Board.GetRAMWord(0, offset)
		var j = (offset & 0xFFFE);
		return ((RAM[0][j+1]<<8)|RAM[0][j]);
    case ADDRTYPE.RAM1:			//Board.GetRAMWord(1, offset)
		var j = (offset & 0xFFFE);
		return ((RAM[1][j+1]<<8)|RAM[1][j]);
    case ADDRTYPE.RAM2:			//Board.GetRAMWord(2, offset)
		var j = (offset & 0xFFFE);
		return ((RAM[2][j+1]<<8)|RAM[2][j]);
    case ADDRTYPE.RAM12:		//combined
		var j = offset>>>1;
        return (RAM[1][j]|(RAM[2][j]<<8));
    case ADDRTYPE.ROMCART1:
        return Board.GetROMCartWord(1, offset);
    case ADDRTYPE.ROMCART2:
        return Board.GetROMCartWord(2, offset);
    case ADDRTYPE.ROM:
        return Board.GetROMWord(offset);
    case ADDRTYPE.IO:
        if(!fview) return self.GetPortWord(address);
    case ADDRTYPE.DENY:
        //TODO: Exception processing
        return 0;
    }

    ASSERT(false);  // If we are here - then addrtype has invalid value
    return 0;
}

// both CPU and PPU
/*uint8_t*/ this.GetByte = function(/*uint16_t*/ address, fview)
{
    switch (self.TA(address, fview))
    {
    case ADDRTYPE.RAM0:
        return RAM[0][offset];
    case ADDRTYPE.RAM1:
        return RAM[1][offset];
    case ADDRTYPE.RAM2:
        return RAM[2][offset];
    case ADDRTYPE.RAM12:
        return RAM[1+(offset&1)][offset>>>1];
		
    case ADDRTYPE.ROMCART1:
        return Board.GetROMCartByte(1, offset);
    case ADDRTYPE.ROMCART2:
        return Board.GetROMCartByte(2, offset);

    case ADDRTYPE.ROM:
        return Board.GetROMByte(offset);
    case ADDRTYPE.IO:
        if(!fview) {
         var word = self.GetPortWord(address);
         return (((address & 1)?(word>>>8):word)&255);
        }
    case ADDRTYPE.DENY:
        //TODO: Exception processing
        return 0;
    }

    ASSERT(false);  // If we are here - then addrtype has invalid value
    return 0;
}

// both CPU and PPU
/*void*/ this.SetWord = function (/*uint16_t*/ address, /*uint16_t*/ word)
{
    switch (self.TA(address,0))
    {
    case ADDRTYPE.RAM0:
        Board.SetRAMWord(0, offset, word);
        return;
    case ADDRTYPE.RAM1:
        Board.SetRAMWord(1, offset, word);
        return;
    case ADDRTYPE.RAM2:
        Board.SetRAMWord(2, offset, word);
        return;
    case ADDRTYPE.RAM12:
		var o = offset >>>1;
        Board.SetRAMByte(1, o, (word & 255));
        Board.SetRAMByte(2, o, ((word >>> 8) & 255));
        return;

    case ADDRTYPE.ROMCART1:
    case ADDRTYPE.ROMCART2:
    case ADDRTYPE.ROM:
        // Nothing to do: writing to ROM
        return;

    case ADDRTYPE.IO:
        self.SetPortWord(address, word);
        return;

    case ADDRTYPE.DENY:
        //TODO: Exception processing
        return;
    }

    ASSERT(false);  // If we are here - then addrtype has invalid value
}

// both CPU and PPU
/*void*/ this.SetByte = function(/*uint16_t*/ address, /*uint8_t*/ b)
{	
    switch (self.TA(address,0))
    {
    case ADDRTYPE.RAM0:
        Board.SetRAMByte(0, offset, b);
        return;
    case ADDRTYPE.RAM1:
        Board.SetRAMByte(1, offset, b);
        return;
    case ADDRTYPE.RAM2:
        Board.SetRAMByte(2, offset, b);
        return;
    case ADDRTYPE.RAM12:
        Board.SetRAMByte(1+(offset&1), offset>>>1, b);
        return;

    case ADDRTYPE.ROMCART1:
    case ADDRTYPE.ROMCART2:
    case ADDRTYPE.ROM:
        // Nothing to do: writing to ROM
        return;
    case ADDRTYPE.IO:
        self.SetPortByte(address, b);
        return;
    case ADDRTYPE.DENY:
        //TODO: Exception processing
        return;
    }
    ASSERT(false);  // If we are here - then addrtype has invalid value
}


//----------------------- NOW ADDITIONAL (OVERRIDE) CLASS
//
// CPU memory controller
// is connected to RAM plane 1 & 2.
//
// 174000-177777 I/O - USER - read/write
// 160000-173777     - USER - access denied
// 0-157777 USER - read/write/execute
//
// 174000-177777 I/O - HALT - read/write
// 174000-177777 ОЗУ - HALT - execute
// 160000-173777 ОЗУ - HALT - read/write/execute
// 0-157777 HALT - read/write/execute
//
// For RAM access, bytes at even addresses (low byte of word) belongs to plane 1,
// and bytes at odd addresses (high byte of word) - belongs to plane 2.

if(Which==0)  {	// ::FirstMemoryController

// for CPU
function init0()
{
   PU = Cpu;
   
   Port.o176640 = 0;
   Port.o176642 = 0;
   Port.o176644 = 0;
   Port.o176646 = 0;
   Port.o176560 =Port.o176562 =Port.o176566 = 0;  // Network СА
   Port.o176564 = 128; /*0200*/
   Port.o176570 =Port.o176572 =Port.o176576 = 0;  // RS-232 ports
   Port.o176574 = 128; /*0200*/
   Port.NetStation = 0;
}

init0();		// now


/*void*/ this.DCLO_Signal = function()
{
   Port.o176564 = 128; /*0200*/
   Port.o176574 = 128; /*0200*/
}

/*void*/ this.ResetDevices = function()
{
    Board.ChanResetByCpu();
   Port.o176644 = 0;
    PU.VIRQ(6, 0);
   Port.o176560 = 0;
   Port.o176564 = 128; /*0200*/
   Port.o176570 = 0;
   Port.o176574 = 128; /*0200*/
    //TODO
}

// for CPU   TranslateAddress
/*int*/ this.TA = function( /*uint16_t*/ address, /*bool*/ fview)
{
	var Hf = PU.Halted();
    if ((!dbg.active) && ((Port.o176644 & 0x101) == 0x101) &&
		(address ==Port.o176646) && (((Port.o176644 & 2) == 2) == Hf))
    {
        PU.VIRQ(6,Port.o176644 & 0xFC);
    }
    if (address < 57344 /*0160000*/ )    // CPU RAM (plane 1 & 2)
    {
        offset = address;
        return ADDRTYPE.RAM12;
    }
    else
    {
        if (Hf)
        {
            // HALT mode
            offset = address;
            return ADDRTYPE.RAM12;
        }
        else
        {
            offset = address;
            return ADDRTYPE.IO;
        }
    }

    ASSERT(false);  // If we are here - then if isn't cover all addresses
    return 0;
}

// for CPU
/*uint16_t*/this.GetPortWord = function(/*uint16_t*/ address)
{
    switch (address)
    {
    case 64928 /*0176640*/ :
    case 64929 /*0176641*/ :
        return Port.o176640;  // Plane address register
    case 64930 /*0176642*/ :
    case 64931 /*0176643*/ :
       Port.o176642 = (RAM[1][Port.o176640] | (RAM[2][Port.o176640]<<8));
        return Port.o176642;  // Plane 1 & 2 data register

    case 64932 /*0176644*/ : case 64933 /*0176645*/:
        return (Port.o176644 & 0x200);
    case 64934 /*0176646*/ : case 64935 /*0176647*/:
        return 0;

    case 65392 /*0177560*/ :
    case 65393 /*0177561*/ :
        return Board.ChanRxStateGetCpu(0);
    case 65394 /*0177562*/ :
    case 65395 /*0177563*/ :
        return Board.ChanReadByCpu(0);
    case 65396 /*0177564*/ :
    case 65397 /*0177565*/ :
        return Board.ChanTxStateGetCpu(0);

    case 64944 /*0176660*/ :
    case 64945 /*0176661*/ :
        return Board.ChanRxStateGetCpu(1);
    case 64946 /*0176662*/ :
    case 64947 /*0176663*/ :
        return Board.ChanReadByCpu(1);
    case 64948 /*0176664*/ :
    case 65461 /*0177665*/ :
        return Board.ChanTxStateGetCpu(1);
    case 64956 /*0176674*/ :
    case 64957 /*0176675*/ :
        return Board.ChanTxStateGetCpu(2);
    case 65398 /*0177566*/ :
    case 65399 /*0177567*/ :
    case 64950 /*0176666*/ :
    case 64951 /*0176667*/ :
    case 64958 /*0176676*/ :
    case 64959 /*0176677*/ :
    case 64952 /*0176670*/ :
    case 64953 /*0176671*/ :
    case 64954 /*0176672*/ :
    case 64955 /*0176673*/ :
        return 0;

    case 64880 /*0176560*/ : //network
    case 64881 /*0176561*/ : // CA: receiver status register
        return (Port.o176560 + Port.NetStation);
    case 64882 /*0176562*/ : // CA: receiver data register
    case 64883 /*0176563*/ : // lowest 8 bits accessible for reading
       Port.o176560 &= (~4224); /*010200*/  // Reset bit 12 and bit 7
        return (Port.o176562 + Port.NetStation);
    case 64884 /*0176564*/ : // CA: source (sender) status register
    case 64885 /*0176565*/ :
        return (Port.o176564 + Port.NetStation);
    case 64886 /*0176566*/ : // CA: source data register
    case 64887 /*0176567*/ :
        return (240 /*0360*/  + Port.NetStation);

    case 64888 /*0176570*/ :  // Plug C2: receiver status register
    case 64889 /*0176571*/ :
        return Port.o176570;
    case 64890 /*0176572*/ :  // Plug C2: receiver data register
    case 64891 /*0176573*/ :  // lowest 8 bits accessible for reading
       Port.o176570 &= (~4224); /*010200*/   // Reset bit 12 and bit 7
        return Port.o176572;
    case 64892 /*0176574*/ :  // Plug C2: source (sender) status register
    case 64893 /*0176575*/ :
        return Port.o176574;
    case 64894 /*0176576*/ :  // Plug C2: source data register
    case 64895 /*0176577*/ :
        return 248; /*0370*/

    default:
        if (!(((Port.o176644 & 0x103) == 0x100) && Port.o176646 == address))
            PU.MemoryError(address);
        return 0;
    }

    ASSERT(false);
    return 0;
}

// for CPU
/*void*/ this.SetPortByte = function(/*uint16_t*/ address, /*uint8_t*/ b)
{
    var /*uint16_t*/ word = ((address & 1) ? b << 8 : b);
    switch (address)
    {
    case 64928 /*0176640*/ :  // Plane address register
    case 64929 /*0176641*/ :
        self.SetPortWord(address, word);
        break;
    case 64930 /*0176642*/ :  // Plane 1 & 2 data register
       Port.o176642 &= 0xFF00;
       Port.o176642 |= word;
        Board.SetRAMByte(1,Port.o176640, (word & 255));
        break;
    case 64931 /*0176643*/ :
       Port.o176642 &= 255;
       Port.o176642 |= word;
        Board.SetRAMByte(2,Port.o176640, ((word >> 8) & 255));
        break;

    case 64932 /*0176644*/ :
	case 64933 /*0176645*/ :
        self.SetPortWord(address, word);
        break;
    case 64934 /*0176646*/ :
	case 64935 /*0176647*/ :
        self.SetPortWord(address, word);
        break;

    case 65392 /*0177560*/ :
        Board.ChanRxStateSetCpu(0, word & 255);
        break;
    case 65393 /*0177561*/ :
        Board.ChanRxStateSetCpu(0, 0);
        break;
    case 65394 /*0177562*/ :
    case 65395 /*0177563*/ :
        break;
    case 65396 /*0177564*/ :
        Board.ChanTxStateSetCpu(0, word & 255);
        break;
    case 65397 /*0177565*/ :
        Board.ChanTxStateSetCpu(0, 0);
        break;
    case 65398 /*0177566*/ :  // TX data, channel 0
        Board.ChanWriteByCpu(0, word & 255);
        break;
    case 65399 /*0177567*/ :
        Board.ChanWriteByCpu(0, 0);
        break;
    case 64944 /*0176660*/ :
        Board.ChanRxStateSetCpu(1, word & 255);
        break;
    case 64945 /*0176661*/ :
        Board.ChanRxStateSetCpu(1, 0);
        break;
    case 64946 /*0176662*/ :
    case 64947 /*0176663*/ :
        break ;
    case 64948 /*0176664*/ :
        Board.ChanTxStateSetCpu(1, word & 255);
        break;
    case 64949 /*0176665*/ :
        Board.ChanTxStateSetCpu(1, 0);
        break;
    case 64950 /*0176666*/ :  // TX data, channel 1
        Board.ChanWriteByCpu(1, word & 255);
        break;
    case 64951 /*0176667*/ :
        Board.ChanWriteByCpu(1, 0);
        break;
    case 64956 /*0176674*/ :
        Board.ChanTxStateSetCpu(2, word & 255);
        break;
    case 64957 /*0176675*/ :
        Board.ChanTxStateSetCpu(2, 0);
        break;
    case 64958 /*0176676*/ :  // TX data, channel 2
        Board.ChanWriteByCpu(2, word & 255);
        break;
    case 64959 /*0176677*/ :
        Board.ChanWriteByCpu(2, 0);
        break;
    case 64952 /*0176670*/ :
    case 64953 /*0176671*/ :
    case 64954 /*0176672*/ :
    case 64955 /*0176673*/ :
        break;

    case 64880 /*0176560*/ : //network
    case 64881 /*0176561*/ : // CA: receiver status register
       Port.o176560 = (Port.o176560 & (~68) /*0104*/ ) | (word & 68 /*0104*/ );  // Bits 2,6 only
        break;
    case 64882 /*0176562*/ : // CA: receiver data register
    case 64883 /*0176563*/ : // unavailable for writing
        return ;
    case 64884 /*0176564*/ : // СА: source (sender) status register
    case 64885 /*0176565*/ :
       Port.o176564 = (Port.o176564 & (~69) /*0105*/ ) | (word & 69 /*0105*/ );  // Bits 0,2,6
        break;
    case 64886 /*0176566*/ : // СА: source data register
    case 64887 /*0176567*/ : // lowest 8 bits accessible for writing
       Port.o176566 = word & 255;
       Port.o176564 &= (~128); /*0200*/   // Reset bit 7 (Ready)
        break;

    case 64888 /*0176570*/ :  // Plug C2 ("Centronics", kind of COM port): receiver status register
    case 64889 /*0176571*/ :
       Port.o176570 = (Port.o176570 & (~64) /*0100*/ ) | (word & 64 /*0100*/ );  // Bit 6 only
        break;
    case 64890 /*0176572*/ :  // Plug C2: receiver data register
    case 64891 /*0176573*/ :  // unavailable for writing
        return ;
    case 64892 /*0176574*/ :  // Plug C2: source (sender) status register
    case 64893 /*0176575*/ :
       Port.o176574 = (Port.o176574 & (~69) /*0105*/ ) | (word & 69 /*0105*/ );  // Bits 0,2,6
        break;
    case 64894 /*0176576*/ :  // Plug C2: source data register
    case 64895 /*0176577*/ :  // lowest 8 bits accessible for writing
       Port.o176576 = word & 255;
       Port.o176574 &= (~128); /*0200*/   // Reset bit 7 (Ready)
        break;

    default:
        if (!(((Port.o176644 & 0x103) == 0x100) && Port.o176646 == address))
            PU.MemoryError(address);
        break;
    }
}

// for CPU
/*void*/ this.SetPortWord = function(/*uint16_t*/ address, /*uint16_t*/ word)
{
    switch (address)
    {
    case 64928 /*0176640*/ :  // Plane address register
    case 64929 /*0176641*/ :
       Port.o176640 = word;
       Port.o176642 = (RAM[1][Port.o176640] | (RAM[2][Port.o176640]<<8));
        break;
    case 64930 /*0176642*/ :  // Plane 1 & 2 data register
    case 64931 /*0176643*/ :
       Port.o176642 = word;
        Board.SetRAMByte(1,Port.o176640, (word & 255));
        Board.SetRAMByte(2,Port.o176640,  ((word >>> 8) & 255));
        break;

    case 64932 /*0176644*/ :
	case 64933 /*0176645*/ :
        word &= 0x3FF;
       Port.o176644 = word;
        if ((word & 0x101) == 0x101)
        {
            if ((PU.getVIRQ(6)) != 0)
                PU.VIRQ(6, word & 0xFC);
        }
        else
        {
            PU.VIRQ(6, 0);
        }
        break;
    case 64934 /*0176646*/ :
	case 64935 /*0176647*/ :
       Port.o176646 = word;
        break;

    case 65392 /*0177560*/ :
    case 65393 /*0177561*/ :
        Board.ChanRxStateSetCpu(0, word & 255);
        break;
    case 65394 /*0177562*/ :
    case 65395 /*0177563*/ :
        break;

    case 65396 /*0177564*/ :
    case 65397 /*0177565*/ :
        Board.ChanTxStateSetCpu(0, word & 255);
        break;
    case 65398 /*0177566*/ :  // TX data, channel 0
    case 65399 /*0177567*/ :
        Board.ChanWriteByCpu(0, word & 255);
        break;
    case 64944 /*0176660*/ :
    case 64945 /*0176661*/ :
        Board.ChanRxStateSetCpu(1, word & 255);
        break;
    case 64946 /*0176662*/ :
    case 64947 /*0176663*/ :
        break ;
    case 64948 /*0176664*/ :
    case 64949 /*0176665*/ :
        Board.ChanTxStateSetCpu(1, word & 255);
        break;
    case 64950 /*0176666*/ :  // TX data, channel 1
    case 64951 /*0176667*/ :
        Board.ChanWriteByCpu(1, word & 255);
        break;
    case 64956 /*0176674*/ :
    case 64957 /*0176675*/ :
        Board.ChanTxStateSetCpu(2, word & 255);
        break;
    case 64958 /*0176676*/ :  // TX data, channel 2
    case 64959 /*0176677*/ :
        Board.ChanWriteByCpu(2, word & 255);
        break;
    case 64952 /*0176670*/ :
    case 64953 /*0176671*/ :
    case 64954 /*0176672*/ :
    case 64955 /*0176673*/ :
        break;

    case 64880 /*0176560*/ : //network
    case 64881 /*0176561*/ : // CA: receiver status
        if (((Port.o176560 & 192 /*0300*/ ) == 128 /*0200*/ ) && (word & 64 /*0100*/))
            PU.VIRQ(9, 240 /*0360*/ );
       Port.o176560 = (Port.o176560 & (~68) /*0104*/ ) | (word & 68 /*0104*/ );  // Bits 2,6 only
        break;
    case 64882 /*0176562*/ :  // CA: receiver data
    case 64883 /*0176563*/ :  // unavailable for writing
        return ;
    case 64884 /*0176564*/ :  // CA: source status
    case 64885 /*0176565*/ :
        if (((Port.o176564 & 192 /*0300*/ ) == 128 /*0200*/ ) && (word & 64 /*0100*/))
            PU.VIRQ(10, 244 /*0364*/ );
       Port.o176564 = (Port.o176564 & (~69) /*0105*/ ) | (word & 69 /*0105*/ );  // Bits 0,2,6
        break;
    case 64886 /*0176566*/ :  // CA: source data
    case 64887 /*0176567*/ :  // low8 bits for writing
       Port.o176566 = word & 255;
       Port.o176564 &= (~128); /*0200*/  // Reset bit 7 (Ready)
        break;

    case 64888 /*0176570*/ :  // C2: receiver status
    case 64889 /*0176571*/ :
       Port.o176570 = (Port.o176570 & (~64) /*0100*/ ) | (word & 64 /*0100*/ );  // Bit 6 only
        break;
    case 64890 /*0176572*/ :  // C2: receiver data
    case 64891 /*0176573*/ :  // unavailable for writing
        return ;
    case 64892 /*0176574*/ :  // C2: source status
    case 64893 /*0176575*/ :
        if (((Port.o176574 & 192 /*0300*/ ) == 128 /*0200*/ ) && (word & 64 /*0100*/))
            PU.VIRQ(8, 252 /*0374*/ );
       Port.o176574 = (Port.o176574 & (~69) /*0105*/ ) | (word & 69 /*0105*/ );  // Bits 0,2,6
        break;
    case 64894 /*0176576*/ :  // C2: source data
    case 64895 /*0176577*/ :  // low 8 bits available for writing
       Port.o176576 = word & 255;
       Port.o176574 &= (~128);  // Reset bit 7 (Ready)
        break;

    default:
        if (!(((Port.o176644 & 0x103) == 0x100) &&Port.o176646 == address))
        {
            PU.MemoryError(address);
        }
        break;
    }
}

// for CPU
/*bool*/ this.SerialInput = function(/*uint8_t*/ b)
{
    if (Port.o176570 & 128 /*0200*/ )  // Ready?
       Port.o176570 |= 4096; /*010000*/  // Set Overflow flag
    else
    {
       Port.o176572 = b & 0xFFFF;
       Port.o176570 |= 128; /*0200*/  // Set Ready flag
        if (Port.o176570 & 64 /*0100*/ )  // Interrupt?
            return true;
	}
    return false;
}

// for CPU
/*bool*/ this.NetworkInput = function(/*uint8_t*/ b)
{
    if (Port.o176560 & 128 /*0200*/ )  // Ready?
       Port.o176560 |= 4096; /*010000*/  // Set Overflow flag
    else
    {
       Port.o176562 = b & 0xFFFF;
       Port.o176560 |= 128; /*0200*/  // Set Ready flag
        if (Port.o176560 & 64 /*0100*/ )  // Interrupt?
            return true;
    }

    return false;
}


//----------------------------
//
// CPU memory/IO controller image format (64 bytes):
//   2*8 bytes      8 port registers
//    48 bytes      Reserved

/*void*/ this.SaveToImage = function(/*uint8_t*/ pImage)
{
    var /*uint16_t*/ pwImage=[];
    pwImage[0] =Port.o176640;
    pwImage[1] =Port.o176642;
    pwImage[2] =Port.o176644;
    pwImage[3] =Port.o176646;
    pwImage[4] =Port.o176570;
    pwImage[5] =Port.o176572;
    pwImage[6] =Port.o176574;
    pwImage[7] =Port.o176576;
}

/*void*/ this.LoadFromImage = function(/*uint8_t[] */ I )
{
   var i=0;
   Port.o176640 = N16(I[i++],I[i++]);
   Port.o176642 = N16(I[i++],I[i++]);
   Port.o176644 = N16(I[i++],I[i++]);
   Port.o176646 = N16(I[i++],I[i++]);
   Port.o176570 = N16(I[i++],I[i++]);
   Port.o176572 = N16(I[i++],I[i++]);
   Port.o176574 = N16(I[i++],I[i++]);
   Port.o176576 = N16(I[i++],I[i++]);
}

	// FirstMemoryController
}

//------------------------------------
//
// PPU memory controller
// is connected to RAM plane 0 and ROM.
//
// 177000-177777 I/O - only read/write
// 100000-176777 ROM - full access - read/write/execute
// 0-32767 /*077777*/  RAM - full access - read/write/execute


else {	// ::SecondMemoryController

// for PPU
function init1()
{
   PU = Ppu;
	
   Port.o177010 =Port.o177012 =Port.o177014 = 0;

   Port.o177026 =Port.o177024 = 0;
   Port.o177020 =Port.o177022 = 0;
   Port.o177016 = 0;

   Port.o177700 =Port.o177702 = 0;
   Port.o177716 = 0;

   Port.o177054 = 769; /*01401*/

   Port.o177100 =Port.o177101 =Port.o177102 = 255; /*0377*/
}

init1();	// now


/*void*/ this.DCLO_Signal = function()
{
    DCLO_177716();
}

/*void*/ this.ResetDevices = function()
{
    Init_177716();
    Board.ChanResetByPpu();
    //TODO
}

// for PPU		TranslateAddress
/*int*/ this.TA = function(/*uint16_t*/ address, /*bool*/ fview)
{

    switch ((address >>> 13) & 7)
    {
    default:  // case 0..3 -  000000-077777 - PPU RAM
        {
            offset = address;
            return ADDRTYPE.RAM0;
        }
    case 4:  // 100000-117777 - Window block 0
        {
            if ((Port.o177054 & 16) != 0)  // Port 177054 bit 4 set => RAM selected
            {
                offset = address;
                return ADDRTYPE.RAM0;
            }
            else if ((Port.o177054 & 1) != 0)  // ROM selected
            {
                offset = (address - 32768 /*0100000*/)&0xFFFF>>>0;
                return ADDRTYPE.ROM;
            }
            else if ((Port.o177054 & 14) != 0)  // ROM cartridge selected
            {
                var /*int*/ slot = ((Port.o177054 & 8) == 0) ? 1 : 2;
                if (Board.IsHardImageAttached(slot) && address >= 36864 /*0110000*/ )
                {
                    offset = address;
                    return ADDRTYPE.IO;  // 110000-117777 - HDD ports
                }
                else
                {
                    var /*int*/ bank = (Port.o177054 & 6) >>> 1;
                    offset = ( address - 32768 /*0100000*/  + ((bank - 1) << 13) )&0xFFFF>>>0;
                    return (slot == 1) ? ADDRTYPE.ROMCART1 : ADDRTYPE.ROMCART2;
                }
            }
            return ADDRTYPE.NONE;
        }
    case 5:  // 120000-137777 - Window block 1
        {
            if ((Port.o177054 & 32) != 0)  // Port 177054 bit 5 set => RAM selected
            {
                offset = address;
                return ADDRTYPE.RAM0;
            }
            offset = (address - 32768 /*0100000*/)&0xFFFF>>>0;
            return ADDRTYPE.ROM;
        }
    case 6:  // 140000-157777 - Window block 2
        {
            if ((Port.o177054 & 64) != 0)  // Port 177054 bit 6 set => RAM selected
            {
                offset = address;
                return ADDRTYPE.RAM0;
            }
            offset = (address - 32768 /*0100000*/)&0xFFFF>>>0;
            return ADDRTYPE.ROM;
        }
    case 7:  // 160000-177777 - Window block 3 and I/O
        {
            if (address >= 65024 /*0177000*/ )  // 177000-177777 - I/O addresses
            {
                if (fview)    // Execution on this address is denied
                {
                    offset = 0;
                    return ADDRTYPE.DENY;
                }
                else
                {
                    offset = address;
                    return ADDRTYPE.IO;
                }
            }

            // 160000-176777 - Window block 3
            if ((Port.o177054 & 128) != 0)  // Port 177054 bit 7 set => RAM selected
            {
                offset = address;
                return ADDRTYPE.RAM0;
            }
            offset = (address - 32768 /*0100000*/)&0xFFFF>>>0;
            return ADDRTYPE.ROM;
        }
    }

    ASSERT(false);  // If we are here - then if isn't cover all addresses
    return 0;
}

// for PPU
/*uint16_t*/ this.GetPortWord = function(/*uint16_t*/ address)
{
    switch (address)
    {
    case 65032 /*0177010*/ :
    case 65033 /*0177011*/ :
        return Port.o177010;  // Plane address register
    case 65034 /*0177012*/ :
    case 65035 /*0177013*/ :
        return Port.o177012;  // Plane 0 data register
    case 65036 /*0177014*/ :
    case 65037 /*0177015*/ :
        return Port.o177014;  // Plane 1 & 2 data register
    case 65038 /*0177016*/ :
    case 65039 /*0177017*/ :
        return Port.o177016;  // Sprite Color
    case 65040 /*0177020*/ :
    case 65041 /*0177021*/ :
        return Port.o177020;  // Plane 0,1,2 bits 0-3
    case 65042 /*0177022*/ :
    case 65043 /*0177023*/ :
        return Port.o177022;  // Plane 0,1,2 bits 4-7
    case 65044 /*0177024*/ :  // Load background registers
    case 65045 /*0177025*/ :
        {
		 var A=0, B=0, /*uint8_t*/ p = RAM[0][Port.o177010], l = RAM[1][Port.o177010], n = RAM[2][Port.o177010];

           A |= ((p & 1) ? 1 : 0) << 0;
           A |= ((p & 2) ? 1 : 0) << 4;
           A |= ((p & 4) ? 1 : 0) << 8;
           A |= ((p & 8) ? 1 : 0) << 12;
           B |= ((p & 16) ? 1 : 0) << 0;
           B |= ((p & 32) ? 1 : 0) << 4;
           B |= ((p & 64) ? 1 : 0) << 8;
           B |= ((p & 128) ? 1 : 0) << 12;

           A |= ((l & 1) ? 1 : 0) << 1;
           A |= ((l & 2) ? 1 : 0) << 5;
           A |= ((l & 4) ? 1 : 0) << 9;
           A |= ((l & 8) ? 1 : 0) << 13;
           B |= ((l & 16) ? 1 : 0) << 1;
           B |= ((l & 32) ? 1 : 0) << 5;
           B |= ((l & 64) ? 1 : 0) << 9;
           B |= ((l & 128) ? 1 : 0) << 13;

           A |= ((n & 1) ? 1 : 0) << 2;
           A |= ((n & 2) ? 1 : 0) << 6;
           A |= ((n & 4) ? 1 : 0) << 10;
           A |= ((n & 8) ? 1 : 0) << 14;
           B |= ((n & 16) ? 1 : 0) << 2;
           B |= ((n & 32) ? 1 : 0) << 6;
           B |= ((n & 64) ? 1 : 0) << 10;
           B |= ((n & 128) ? 1 : 0) << 14;
		   
           Port.o177020 = A;
           Port.o177022 = B;
        }
        return 0;
    case 65046 /*0177026*/ :
    case 65047 /*0177027*/ :
        return Port.o177026;  // Plane Mask

    case 65068 /*0177054*/ :
    case 65069 /*0177055*/ :
        return Port.o177054;

    case 65072 /*0177060*/ :
    case 65073 /*0177061*/ :
        return Board.ChanReadByPpu(0);
    case 65074 /*0177062*/ :
    case 65075 /*0177063*/ :
        return Board.ChanReadByPpu(1);
    case 65076 /*0177064*/ :
    case 65077 /*0177065*/ :
        return Board.ChanReadByPpu(2);
    case 65078 /*0177066*/ :
    case 65079 /*0177067*/ :
        return Board.ChanRxStateGetPpu();
    case 65080 /*0177070*/ :
    case 65081 /*0177071*/ :
    case 65082 /*0177072*/ :
    case 65083 /*0177073*/ :
    case 65084 /*0177074*/ :
    case 65085 /*0177075*/ :
        return 0;
    case 65086 /*0177076*/ :
    case 65087 /*0177077*/ :
        return Board.ChanTxStateGetPpu();

    case 65088 /*0177100*/ :  // i8255 port A -- Parallel port output data
        return Port.o177100;
    case 65089 /*0177101*/ :  // i8255 port B
        return Port.o177101;
    case 65090 /*0177102*/ :  // i8255 port C
        return Port.o177102 & 0xF;
    case 65091 /*0177103*/ :  // i8255 control
        return 0;

    case 65472 /*0177700*/ :
    case 65473 /*0177701*/ :
        return Port.o177700;  // Keyboard status
    case 65474 /*0177702*/ :  // Keyboard data
    case 65475 /*0177703*/ :
        {
            var /*uint16_t*/ a =Port.o177702;
            if (Port.o177700 & 128 /*0200*/ ) Port.o177702 = Board.GetScannedKey();
           Port.o177700 &= (~128); /*0200*/  // Reset bit 7 - "data ready" flag
            PU.VIRQ(3, 0);
            return a;
        }

    case 65476 /*0177704*/ :
    case 65477 /*0177705*/ :
        return 4096; /*010000*/  // !!

    case 65480 /*0177710*/ :
    case 65481 /*0177711*/ :
        return Board.GetTimerState();
    case 65484 /*0177714*/ :
    case 65485 /*0177715*/ :
        return Board.GetTimerValue();

    case 65486 /*0177716*/ :
    case 65487 /*0177717*/ :
        return Port.o177716;  // System control register

    case 65112 /*0177130*/ :  // FDD status
    case 65113 /*0177131*/ :
        return FloppyCtl.GetState();

    case 65114 /*0177132*/ : //FDD data
    case 65115 /*0177133*/ :
        return FloppyCtl.GetData();

        // HDD ports
    case 36878 /*0110016*/ :
    case 36876 /*0110014*/ :
    case 36874 /*0110012*/ :
    case 36872 /*0110010*/ :
    case 36870 /*0110006*/ :
    case 36868 /*0110004*/ :
    case 36866 /*0110002*/ :
    case 36864 /*0110000*/ :
        return Board.GetHardPortWord(((Port.o177054 & 8) == 0) ? 1 : 2, address);

    default:
        PU.MemoryError(address);
        break;
    }

    return 0;
}

// for PPU
/*uint8_t*/ this.GetPortByte = function(/*uint16_t*/ address)
{
    var /*uint16_t*/ word = self.GetPortWord(address);
    return (( (address & 1) ? (word >>> 8) : word) & 255 );
}

// for PPU
/*void*/ this.SetPortByte = function(/*uint16_t*/ address, /*uint8_t*/ b)
{
    var /*uint16_t*/ word = ( (address & 1) ? b << 8 : b) & 0xFFFF;
    if ((address >= 36864 /*0110000*/ ) && (address < 40960 /*0120000*/))
        address &= 36878; /*0110016*/
    switch (address)
    {
    case 65032 /*0177010*/ :
    case 65033 /*0177011*/ :
        self.SetPortWord(address, word);
        break;
    case 65034 /*0177012*/ :
    case 65035 /*0177013*/ :
        self.SetPortWord(address, word);
        break;
    case 65036 /*0177014*/ :
       Port.o177014 &= 0xFF00;
       Port.o177014 |= word;
        Board.SetRAMByte(1,Port.o177010, (word & 255));
        break;
    case 65037 /*0177015*/ :
       Port.o177014 &= 255;
       Port.o177014 |= word;
        Board.SetRAMByte(2,Port.o177010, ((word >>> 8) & 255));
        break;
    case 65038 /*0177016*/ :
    case 65039 /*0177017*/ :
        self.SetPortWord(address, word);
        break;
    case 65040 /*0177020*/ :
    case 65041 /*0177021*/ :
        self.SetPortWord(address, word);
        break;
    case 65042 /*0177022*/ :
    case 65043 /*0177023*/ :
        self.SetPortWord(address, word);
        break;
    case 65044 /*0177024*/ :
    case 65045 /*0177025*/ :
        self.SetPortWord(address, word);
        break;
    case 65046 /*0177026*/ :
    case 65047 /*0177027*/ :
        self.SetPortWord(address, word);
        break;
    case 65068 /*0177054*/ :
    case 65069 /*0177055*/ :
        self.SetPortWord(address, word);
        break;

    case 65072 /*0177060*/ :
    case 65073 /*0177061*/ :
    case 65074 /*0177062*/ :
    case 65075 /*0177063*/ :
    case 65076 /*0177064*/ :
    case 65077 /*0177065*/ :
        break;
    case 65078 /*0177066*/ :  // RX status, channels 0,1,2
        Board.ChanRxStateSetPpu( word & 255);
        break;
    case 65079 /*0177067*/ :
        Board.ChanRxStateSetPpu(0);
        break;
    case 65080 /*0177070*/ :  // TX data, channel 0
        Board.ChanWriteByPpu(0, word & 255);
        break;
    case 65081 /*0177071*/ :
        Board.ChanWriteByPpu(0, 0);
        break;
    case 65082 /*0177072*/ :  // TX data, channel 1
        Board.ChanWriteByPpu(1, word & 255);
        break;
    case 65083 /*0177073*/ :
        Board.ChanWriteByPpu(1, 0);
        break;
    case 65084 /*0177074*/ :
    case 65085 /*0177075*/ :
        break;
    case 65086 /*0177076*/ :  // TX status, channels 0,1
        Board.ChanTxStateSetPpu( word & 255);
        break;
    case 65087 /*0177077*/ :
        Board.ChanTxStateSetPpu(0);
        break;

    case 65088 /*0177100*/ :  // i8255 port A -- Parallel port output data
       Port.o177100 = (word & 255);
        break;
    case 65089 /*0177101*/ :  // i8255 port B
        break;
    case 65090 /*0177102*/ :  // i8255 port C
       Port.o177102 = ((Port.o177102 & 0xF) | (word & 0xF0));
        break;
    case 65091 /*0177103*/ :  // i8255 control byte
        break;

    case 65112 /*0177130*/ :  // FDD status
    case 65113 /*0177131*/ :
        FloppyCtl.SetCommand(word);
        break;
    case 65114 /*0177132*/ :  // FDD data
    case 65115 /*0177133*/ :
        FloppyCtl.WriteData(word);
        break;

    case 65472 /*0177700*/ :  // Keyboard status
    case 65473 /*0177701*/ :
        self.SetPortWord(address, word);
        break;
    case 65476 /*0177704*/ : // FDD params:
    case 65477 /*0177705*/ :
        break;

    case 65480 /*0177710*/ : //timer status
    case 65481 /*0177711*/ :
        Board.SetTimerState(word);
        break;
    case 65482 /*0177712*/ : //timer latch
    case 65483 /*0177713*/ :
        Board.SetTimerReload(word);
        break;
    case 65484 /*0177714*/ : //timer counter
    case 65485 /*0177715*/ :
        //Board.sett
        break;
    case 65486 /*0177716*/ :  // System control register
    case 65487 /*0177717*/ :
        self.SetPortWord(address, word);
        break;

        // HDD ports
    case 36878 /*0110016*/ :
    case 36876 /*0110014*/ :
    case 36874 /*0110012*/ :
    case 36872 /*0110010*/ :
    case 36870 /*0110006*/ :
    case 36868 /*0110004*/ :
    case 36866 /*0110002*/ :
    case 36864 /*0110000*/ :
        Board.SetHardPortWord(((Port.o177054 & 8) == 0) ? 1 : 2, address, word);
        break;

    default:
        PU.MemoryError(address);
        break;
    }
}

// for PPU
/*void*/ this.SetPortWord = function(/*uint16_t*/ address, /*uint16_t*/ word)
{

    if ((address >= 36864 /*0110000*/ ) && (address < 40960 /*0120000*/))
        address &= 36878; /*0110016*/
    switch (address)
    {
    case 65032 /*0177010*/ :  // Plane address register
    case 65033 /*0177011*/ :
       Port.o177010 = word;
       Port.o177012 = RAM[0][word];
       Port.o177014 = (RAM[1][word] | (RAM[2][word]<<8));
        break;
    case 65034 /*0177012*/ :  // Plane 0 data register
    case 65035 /*0177013*/ :
       Port.o177012 = word & 255;
        Board.SetRAMByte(0,Port.o177010, /*uint8_t*/(word & 255));
        break;
    case 65036 /*0177014*/ :  // Plane 1 & 2 data register
    case 65037 /*0177015*/ :
       Port.o177014 = word;
        Board.SetRAMByte(1,Port.o177010, (word & 255));
        Board.SetRAMByte(2,Port.o177010, ((word >>> 8) & 255));
        break;

    case 65038 /*0177016*/ :  // Sprite Color
    case 65039 /*0177017*/ :
       Port.o177016 = word & 7;
        break;
    case 65040 /*0177020*/ :  // Background color code, plane 0,1,2 bits 0-3
    case 65041 /*0177021*/ :
       Port.o177020 = word;
        break;
    case 65042 /*0177022*/ :  // Background color code, plane 0,1,2 bits 4-7
    case 65043 /*0177023*/ :
       Port.o177022 = word;
        break;
    case 65044 /*0177024*/ :  // Pixel byte
    case 65045 /*0177025*/ :
        {
           Port.o177024 = word & 255;
            // Convert background into planes... it could've been modified by user
            var A = Port.o177020, B = Port.o177022, /*uint8_t*/ p=0, l=0, n=0;
			
            p = ((A & 1) ? 1 : 0) << 0;
            p |= ((A & (1 << 4)) ? 1 : 0) << 1;
            p |= ((A & (1 << 8)) ? 1 : 0) << 2;
            p |= ((A & (1 << 12)) ? 1 : 0) << 3;
            p |= ((B & (1 << 0)) ? 1 : 0) << 4;
            p |= ((B & (1 << 4)) ? 1 : 0) << 5;
            p |= ((B & (1 << 8)) ? 1 : 0) << 6;
            p |= ((B & (1 << 12)) ? 1 : 0) << 7;

            l = ((A & (1 << 1)) ? 1 : 0) << 0;
            l |= ((A & (1 << 5)) ? 1 : 0) << 1;
            l |= ((A & (1 << 9)) ? 1 : 0) << 2;
            l |= ((A & (1 << 13)) ? 1 : 0) << 3;
            l |= ((B & (1 << 1)) ? 1 : 0) << 4;
            l |= ((B & (1 << 5)) ? 1 : 0) << 5;
            l |= ((B & (1 << 9)) ? 1 : 0) << 6;
            l |= ((B & (1 << 13)) ? 1 : 0) << 7;

            n = ((A & (1 << 2)) ? 1 : 0) << 0;
            n |= ((A & (1 << 6)) ? 1 : 0) << 1;
            n |= ((A & (1 << 10)) ? 1 : 0) << 2;
            n |= ((A & (1 << 14)) ? 1 : 0) << 3;
            n |= ((B & (1 << 2)) ? 1 : 0) << 4;
            n |= ((B & (1 << 6)) ? 1 : 0) << 5;
            n |= ((B & (1 << 10)) ? 1 : 0) << 6;
            n |= ((B & (1 << 14)) ? 1 : 0) << 7;
			
            // Draw sprite
            p &= (~Port.o177024);
            if (Port.o177016 & 1) p |=Port.o177024;
			
            l &= (~Port.o177024);
            if (Port.o177016 & 2) l |=Port.o177024;
			
            n &= (~Port.o177024);
            if (Port.o177016 & 4) n |=Port.o177024;

            if ((Port.o177026 & 1) == 0)
                Board.SetRAMByte(0,Port.o177010, p);
            if ((Port.o177026 & 2) == 0)
                Board.SetRAMByte(1,Port.o177010, l);
            if ((Port.o177026 & 4) == 0)
                Board.SetRAMByte(2,Port.o177010, n);
        }
        break;
    case 65046 /*0177026*/ :  // Pixel mask
    case 65047 /*0177027*/ :
       Port.o177026 = word & 7;
        break;
    case 65068 /*0177054*/ :  // Address space control
    case 65069 /*0177055*/ :
       Port.o177054 = word & 1023; /*01777*/
        break;

    case 65072 /*0177060*/ :
    case 65073 /*0177061*/ :
    case 65074 /*0177062*/ :
    case 65075 /*0177063*/ :
    case 65076 /*0177064*/ :
    case 65077 /*0177065*/ :
        break;
    case 65078 /*0177066*/ :  // RX status, channels 0,1,2
    case 65079 /*0177067*/ :
        Board.ChanRxStateSetPpu(word & 255);
        break;
    case 65080 /*0177070*/ :  // TX data, channel 0
    case 65081 /*0177071*/ :
        Board.ChanWriteByPpu(0, word & 255);
        break;
    case 65082 /*0177072*/ :  // TX data, channel 1
    case 65083 /*0177073*/ :
        Board.ChanWriteByPpu(1, word & 255);
        break;
    case 65084 /*0177074*/ :
    case 65085 /*0177075*/ :
        break;
    case 65086 /*0177076*/ :  // TX status, channels 0,1
    case 65087 /*0177077*/ :
        Board.ChanTxStateSetPpu(word & 255);
        break;

    case 65088 /*0177100*/ :  // i8255 port A -- Parallel port output data
       Port.o177100 = (word & 255);
        break;
    case 65089 /*0177101*/ :  // i8255 port B
        break;
    case 65090 /*0177102*/ :  // i8255 port C
       Port.o177102 = ((Port.o177102 & 15) | (word & 0xF0));
        break;
    case 65091 /*0177103*/ :  // i8255 control byte
       Port.o177100 = 255; /*0377*/   // Writing to control register resets port A
        break;

    case 65112 /*0177130*/ :  // FDD status
    case 65113 /*0177131*/ :
        FloppyCtl.SetCommand(word);
        break;
    case 65114 /*0177132*/ :  // FDD data
    case 65115 /*0177133*/ :
        FloppyCtl.WriteData(word);
        break;

    case 65472 /*0177700*/ :  // Keyboard status
    case 65473 /*0177701*/ :
        if (((Port.o177700 & 64 /*0100*/ ) == 0) && (word & 64 /*0100*/ ) && (Port.o177700 & 128 /*0200*/))
            PU.VIRQ(3, 192 /*0300*/ );
        if ((word & 64 /*0100*/ ) == 0)
            PU.VIRQ(3, 0);
       Port.o177700 = (Port.o177700 & 65471 /*0177677*/ ) | (word & 64 /*0100*/);
        break;
    case 65474 /*0177702*/ :  // Keyboard data register
        break;

    case 65476 /*0177704*/ : // FDD params:
    case 65477 /*0177705*/ :
        break;

    case 65480 /*0177710*/ : //timer status
    case 65481 /*0177711*/ :
        Board.SetTimerState(word);
        break;
    case 65482 /*0177712*/ : //timer latch
    case 65483 /*0177713*/ :
        Board.SetTimerReload(word);
        break;
    case 65484 /*0177714*/ : //timer counter
    case 65485 /*0177715*/ :
		//Board.sett
        break;
    case 65486 /*0177716*/ :  // System control register
    case 65487 /*0177717*/ :
        {
            word &= 49086; /*0137676*/
            Cpu.SetHALTPin((word & 16 /*020*/ ) ? true : false);
            Cpu.SetDCLOPin((word & 32 /*040*/ ) ? true : false);
            Cpu.SetACLOPin((word & 32768 /*0100000*/ ) ? false : true);
           Port.o177716 &= 1;
           Port.o177716 |= word;
            Board.SetSound(word);
            break;
        }

        // HDD ports
    case 36878 /*0110016*/ :
    case 36876 /*0110014*/ :
    case 36874 /*0110012*/ :
    case 36872 /*0110010*/ :
    case 36870 /*0110006*/ :
    case 36868 /*0110004*/ :
    case 36866 /*0110002*/ :
    case 36864 /*0110000*/ :
        Board.SetHardPortWord(((Port.o177054 & 8) == 0) ? 1 : 2, address, word);
        break;

    default:
        PU.MemoryError(address);
        break;
    }

}



// Keyboard key pressed or released
/*void*/ this.KeyboardEvent = function(/*uint8_t*/ scancode, /*bool*/ okPressed)
{
    if (okPressed)
       Port.o177702 = (scancode & 127 /*0177*/ );
    else
       Port.o177702 = (scancode & 15 /*017*/ ) | 128 /*0200*/;

   Port.o177700 |= 128; /*0200*/  // Set bit 7 - "data ready" flag

    if ((Port.o177700 & 64 /*0100*/ ) != 0)  // Keyboard interrupt enabled
    {
        PU.VIRQ(3, 192 /*0300*/ );
    }
}


function /*void*/ DCLO_177716()
{
   Port.o177716 &= 32719; /*0077717*/
    Cpu.SetHALTPin(false);
    Cpu.SetDCLOPin(false);
    Cpu.SetACLOPin(true);
}

function /*void*/ Init_177716()
{
   Port.o177716 &= 40753; /*0117461*/
}


//---------------------
//
// PPU memory/IO controller image format (64 bytes):
//   2*12 bytes     12 port registers
//      3 bytes     3 port registers
//     37 bytes     Reserved

/*void*/ this.SaveToImage = function(/*Uint8array*/I, o)
{

   waddI8( I,o, Port.o177010 );
   waddI8( I,o, Port.o177012 );
   waddI8( I,o, Port.o177014 );

   waddI8( I,o, Port.o177016 );
   waddI8( I,o, Port.o177020 );
   waddI8( I,o, Port.o177022 );
   waddI8( I,o, Port.o177024 );
   waddI8( I,o, Port.o177026 );

   waddI8( I,o, Port.o177700 );
   waddI8( I,o, Port.o177702 );
   waddI8( I,o, Port.o177716 );
   
   waddI8( I,o, Port.o177054 );

   waddI8( I,o, Port.o177100 );
   waddI8( I,o, Port.o177101 );
   waddI8( I,o, Port.o177102 );
 
}

/*void*/ this.LoadFromImage = function(/*uint8_t[] */ I )
{
	var i=0;
	
   Port.o177010 = N16(I[i++],I[i++]);
   Port.o177012 = N16(I[i++],I[i++]);
   Port.o177014 = N16(I[i++],I[i++]);

   Port.o177016 = N16(I[i++],I[i++]);
   Port.o177020 = N16(I[i++],I[i++]);
   Port.o177022 = N16(I[i++],I[i++]);
   Port.o177024 = N16(I[i++],I[i++]);
   Port.o177026 = N16(I[i++],I[i++]);

   Port.o177700 = N16(I[i++],I[i++]);
   Port.o177702 = N16(I[i++],I[i++]);
   Port.o177716 = N16(I[i++],I[i++]);

   Port.o177054 = N16(I[i++],I[i++]);

   Port.o177100 = I[i++];
   Port.o177101 = I[i++];
   Port.o177102 = I[i++];

}
		// SecondMemoryController
}

//-------------------

	PU.MC = this;

	return this;		// Memory
}
