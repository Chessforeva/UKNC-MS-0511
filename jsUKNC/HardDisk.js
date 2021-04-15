

/* Hard Drive IDE compatible */

HardDrive = function(i) {

	var self = this;

	this.attached = false;
	this.FileName = "";
	this.okReadOnly = false;			// can write always
	this.id = "hd"+i.toString()+':';			// id

	var /*bool*/ okInverted = false;	//Flag indicating that the HDD image has inverted bits
	var /*uint8_t*/ status = IDE.STATUS.BUSY;	// IDE status register, see IDE.STATUS.XXX constants
	var /*uint8_t*/ error = IDE.ERROR.NONE;	// IDE error register, see IDE.ERROR.XXX constants
	var /*uint8_t*/ command = 0;	//Current IDE command, see IDE.COMMAND.XXX constants
	var /*int*/ numcylinders = 0;     // Cylinder count
	var /*int*/ numheads = 0;         // Head count
	var /*int*/ numsectors = 0;       // Sectors per track
	var /*int*/ curcylinder = 0;      // Current cylinder number
	var /*int*/ curhead = 0;          // Current head number
	var /*int*/ cursector = 0;        // Current sector number
	var /*int*/ curheadreg = 0;       // Current head number
	var /*int*/ sectorcount = 0;      // Sector counter for read/write operations
	 
	var /*int*/ bI = 0;     // Current offset within sector: 0..511
	var /*int*/ tm_cnt = 0;     // Timeout counter to wait for the next event
	var /*int*/ tm_evt = 0;     // Current stage of operation
	
	this.bytesAll = [];				// all bytes of disk

	var buffer = [];	// Sector data buffer in DISK_SECTOR_SIZE=512

	
// Inverts 512 bytes in the buffer
function /*void*/ InvertBuffer(A) {
    for (var i = 0; i < 512; i++) A[i] = (~A[i]);
}

	
/*void*/this.Reset = function()
{
    status = IDE.STATUS.BUSY;
    error = IDE.ERROR.NONE;
    command = 0;
    tm_cnt = 2;
    tm_evt = IDE.TIMEEVT.RESET_DONE;
	
	self.bytesAll = [];
	self.attached = false;
}

/*bool*/this.AttachImage = function(/*string*/ FileName, /*Uint8array*/ bytes )
{

	if( bytes.length < IDE.DISK_SECTOR_SIZE ) return false;
	
	self.bytesAll = bytes;
	
    // Read first sector
	for(var j=0; j<IDE.DISK_SECTOR_SIZE; j++) {
		buffer[j] = self.bytesAll[j]
		}
	
    // Autodetect inverted image
    var /*uint8_t*/ test = 255;
    for (var /*int*/ i = 0x1F0; i <= 0x1FB; i++)
        test &= buffer[i];
    okInverted = (test == 255);
    // Invert the buffer if needed
    if (okInverted)
        InvertBuffer(buffer);

    // Calculate geometry
    numsectors = buffer[0];
    numheads   = buffer[1];
    if (numsectors == 0 || numheads == 0)
        return false;  // Geometry params are not defined
    numcylinders = parseInt( self.bytesAll.length / IDE.DISK_SECTOR_SIZE / numsectors / numheads);
    if (numcylinders == 0 || numcylinders > 1024)
        return false;

    curcylinder = curhead = curheadreg = cursector = bI = 0;

    status = IDE.STATUS.BUSY;
    error = IDE.ERROR.NONE;
	
	self.FileName = FileName;
	self.attached = true;

    return true;
}

/*void*/ this.DetachImage = function()
{
    self.bytesAll = [];			// clear
	self.attached = false;
}

/*uint16_t*/ this.ReadPort = function(/*uint16_t*/ port)
{
    var /*uint16_t*/ data = 0;
    switch (port)
    {
    case IDE.PORT.DATA:
        if (status & IDE.STATUS.BUFFER_READY)
        {
            data = /*uint16_t*/N16(buffer[bI++],buffer[bI++]);
            if (!okInverted)
                data = ((~data)&0xFFFF)>>>0;  // Image stored non-inverted, but QBUS inverts the bits

            if (bI >= IDE.DISK_SECTOR_SIZE)
            {
                ContinueRead();
            }
        }
        break;
    case IDE.PORT.ERROR:
        data = 0xFF00 | error;
        break;
    case IDE.PORT.SECTOR_COUNT:
        data = 0xFF00 | (/*uint16_t*/(sectorcount&0xFFFF)>>>0);
        break;
    case IDE.PORT.SECTOR_NUMBER:
        data = 0xFF00 | (/*uint16_t*/(cursector&0xFFFF)>>>0);
        break;
    case IDE.PORT.CYLINDER_LSB:
        data = 0xFF00 | (/*uint16_t*/(curcylinder & 255)>>>0);
        break;
    case IDE.PORT.CYLINDER_MSB:
        data = 0xFF00 | (/*uint16_t*/((curcylinder >>> 8) & 255));
        break;
    case IDE.PORT.HEAD_NUMBER:
        data = 0xFF00 | ((/*uint16_t*/curheadreg&0xFFFF)>>>0);
        break;
    case IDE.PORT.STATUS_COMMAND:
        data = 0xFF00 | status;
        break;
    }

	speed.dsk = true;
    return data;
}

/*void*/this.WritePort = function(/*uint16_t*/ port, /*uint16_t*/ data)
{
    switch (port)
    {
    case IDE.PORT.DATA:
        if (status & IDE.STATUS.BUFFER_READY)
        {
            if (!okInverted)
                data = ((~data)&0xFFFF)>>>0;  // Image stored non-inverted, but QBUS inverts the bits
            buffer[bI++] = (data&255)>>>0;
            buffer[bI++] = ((data>>>8)&255);

            if (bI >= IDE.DISK_SECTOR_SIZE)
            {
                status &= (~IDE.STATUS.BUFFER_READY);

                ContinueWrite();
            }
        }
        break;
    case IDE.PORT.ERROR:
        // Writing precompensation value -- ignore
        break;
    case IDE.PORT.SECTOR_COUNT:
        data &= 255;
        sectorcount = ((data == 0) ? 256 : data);
        break;
    case IDE.PORT.SECTOR_NUMBER:
        data &= 255;
        cursector = data;
        break;
    case IDE.PORT.CYLINDER_LSB:
        data &= 255;
        curcylinder = (curcylinder & 0xFF00) | (data & 255);
        break;
    case IDE.PORT.CYLINDER_MSB:
        data &= 255;
        curcylinder = (curcylinder & 255) | ((data & 255) << 8);
        break;
    case IDE.PORT.HEAD_NUMBER:
        data &= 255;
        curhead = data & 15;
        curheadreg = data;
        break;
    case IDE.PORT.STATUS_COMMAND:
        data &= 255;
        HandleCommand(/*uint8_t*/ (data&255));
        break;
    }
	speed.dsk = true;
}

// Called from CMotherboard::SystemFrame() every tick
/*void*/ this.Periodic = function()
{			
    if (tm_cnt > 0)
    {
        tm_cnt--;
        if (tm_cnt == 0)
        {
            var /*int*/ evt = tm_evt;
            tm_evt = IDE.TIMEEVT.NONE;
            switch (evt)
            {
            case IDE.TIMEEVT.RESET_DONE:
                status &= (~IDE.STATUS.BUSY);
                status |= IDE.STATUS.DRIVE_READY | IDE.STATUS.SEEK_COMPLETE;
                break;
            case IDE.TIMEEVT.READ_SECTOR_DONE:
                ReadSectorDone();
                break;
            case IDE.TIMEEVT.WRITE_SECTOR_DONE:
                WriteSectorDone();
                break;
            }
        }
    }
}

/*void*/ function HandleCommand(/*uint8_t*/ cmd)
{
    command = cmd;
    switch (command)
    {
    case IDE.COMMAND.READ_MULTIPLE:
    case IDE.COMMAND.READ_MULTIPLE1:

        status |= IDE.STATUS.BUSY;

        tm_cnt = IDE.TIME_PER_SECTOR * 3;  // Timeout while seek for track
        tm_evt = IDE.TIMEEVT.READ_SECTOR_DONE;
        break;

    case IDE.COMMAND.SET_CONFIG:

        numsectors = sectorcount;
        numheads = curhead + 1;
        break;

    case IDE.COMMAND.WRITE_MULTIPLE:
    case IDE.COMMAND.WRITE_MULTIPLE1:

        bI = 0;
        status |= IDE.STATUS.BUFFER_READY;
        break;

    case IDE.COMMAND.IDENTIFY:

        IdentifyDrive();  // Prepare the buffer
        bI = 0;
        sectorcount = 1;
        status |= IDE.STATUS.BUFFER_READY | IDE.STATUS.SEEK_COMPLETE | IDE.STATUS.DRIVE_READY;
        status &= (~IDE.STATUS.BUSY);
        status &= (~IDE.STATUS.ERROR);
        break;

    default:
        break;
    }
}

function /*void*/ IdentifyDrive()
{
    var /*uint32_t*/ totalsectors = numcylinders * numheads * numsectors;
    memset(buffer, 0, IDE.DISK_SECTOR_SIZE);
	var I = buffer, o = { i:0 };
    waddI8 ( I,o, /*uint16_t*/ 0x45A); 		 // 0, Configuration: fixed disk
	waddI8 ( I,o, /*uint16_t*/ numcylinders);	//1,
	o.i=6; waddI8 ( I,o, /*uint16_t*/ numheads);		//3,
	o.i=12; waddI8 ( I,o, /*uint16_t*/ numsectors);		//6,
	o.i=20; waddI8 ( I,o, /*uint16_t*/ 65 ); /* 10, Serial number*/
	o.i=46; waddI8 ( I,o, /*uint16_t*/ 65 ); /* 23, Firmware version*/
	o.i=54; waddI8 ( I,o, /*uint16_t*/ 65 ); /* 27, Model*/
    o.i=94; waddI8 ( I,o, /*uint16_t*/ 0x8001);  // 47, Read/write multiple support
	o.i=98;	waddI8 ( I,o, /*uint16_t*/ 0x2f00);  // 49, Capabilities: bit9 = LBA
	o.i=106; waddI8 ( I,o, /*uint16_t*/ 1);  // 53, Words 54-58 are valid
	waddI8 ( I,o, /*uint16_t*/ numcylinders);	// 54
	waddI8 ( I,o, /*uint16_t*/ numheads);		// 55
	waddI8 ( I,o, /*uint16_t*/ numsectors);		// 56
	o.i=114; w2x_addI8 ( I,o, /*uint32_t*/ (numheads * numsectors));		// 57
	o.i=120; w2x_addI8 ( I,o, /*uint32_t*/ totalsectors);	// 60
	o.i=200; w2x_addI8 ( I,o, /*uint32_t*/ totalsectors);	// 100

    InvertBuffer(buffer);
}

/*uint32_t*/function CalculateOffset()
{
	speed.dsk = true;
    var /*int*/ sector = (((curcylinder * numheads) + curhead) * numsectors) + (cursector - 1);
    return (sector * IDE.DISK_SECTOR_SIZE);
}

function /*void*/ ReadNextSector()
{
    status |= IDE.STATUS.BUSY;

    tm_cnt = IDE.TIME_PER_SECTOR * 2;  // Timeout while seek for next sector
    tm_evt = IDE.TIMEEVT.READ_SECTOR_DONE;
}

// resize arrays if space too low
function resizeTo( L ) {
	if(!self.okReadOnly) {
		var a = self.bytesAll, l = a.length;
		if( l<L ) {
			var K=0;
			while(K<L) K+=0x100000;		// How much space do we need in megabytes?
			var i=0, b = new Uint8Array(K);
			while(i<L) b[i]=a[i++];
			while(i<K) b[i++]=0;
			self.bytesAll = b;
			}
		}
}

function /*void*/ ReadSectorDone()
{
    status &= (~IDE.STATUS.BUSY);
    status &= (~IDE.STATUS.ERROR);
    status |= IDE.STATUS.BUFFER_READY;
    status |= IDE.STATUS.SEEK_COMPLETE;

    // Read sector from HDD image to the buffer
    var /*uint32_t*/ F = CalculateOffset();
    resizeTo( F + IDE.DISK_SECTOR_SIZE );
	
	for(var i=0; i<IDE.DISK_SECTOR_SIZE && self.bytesAll.length>(F+i); i++) {
		buffer[i] = self.bytesAll[F+i];
		}
	
    if (i != IDE.DISK_SECTOR_SIZE)
    {
        status |= IDE.STATUS.ERROR;
        error = IDE.ERROR.BAD_SECTOR;
        return;
    }

    if (sectorcount > 0)
        sectorcount--;

    if (sectorcount > 0)
    {
        NextSector();
    }

    error = IDE.ERROR.NONE;
    bI = 0;
}

function /*void*/ WriteSectorDone()
{
    status &= (~IDE.STATUS.BUSY);
    status &= (~IDE.STATUS.ERROR);
    status |= IDE.STATUS.BUFFER_READY;
    status |= IDE.STATUS.SEEK_COMPLETE;

	if (self.okReadOnly)
    {
        status |= IDE.STATUS.ERROR;
        error = IDE.ERROR.BAD_SECTOR;
        return;
    }
	
    // Write buffer to the HDD image
    var /*uint32_t*/ F = CalculateOffset();
	resizeTo( F + IDE.DISK_SECTOR_SIZE );
	
	for(var i=0; i<IDE.DISK_SECTOR_SIZE && self.bytesAll.length>(F+i); i++) {
		self.bytesAll[F+i] = buffer[i];
		}
		
    if (i != IDE.DISK_SECTOR_SIZE)
    {
        status |= IDE.STATUS.ERROR;
        error = IDE.ERROR.BAD_SECTOR;
        return;
    }

    if (sectorcount > 0)
        sectorcount--;

    if (sectorcount > 0)
    {
        NextSector();
    }

    error = IDE.ERROR.NONE;
    bI = 0;
}

function /*void*/ NextSector()
{
    // Advance to the next sector, CHS-based
    cursector++;
    if (cursector > numsectors)  // Sectors are 1-based
    {
        cursector = 1;
        curhead++;
        if (curhead >= numheads)
        {
            curhead = 0;
            curcylinder++;
        }
    }
}

function /*void*/ ContinueRead()
{
    bI = 0;

    status &= (~IDE.STATUS.BUFFER_READY);
    status &= (~IDE.STATUS.BUSY);

    if (sectorcount > 0)
        ReadNextSector();
}

function /*void*/ ContinueWrite()
{
    bI = 0;

    status &= (~IDE.STATUS.BUFFER_READY);
    status |= IDE.STATUS.BUSY;

    tm_cnt = IDE.TIME_PER_SECTOR;
    tm_evt = IDE.TIMEEVT.WRITE_SECTOR_DONE;
}

	return this;
}

