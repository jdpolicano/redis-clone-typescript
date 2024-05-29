Some notes on the RDB File spec.

At a high level, the RDB file has the following structure

| Byte Sequence | Description |
| --- | --- |
| `52 45 44 49 53` | Magic String "REDIS" |
| `30 30 30 33` | RDB Version Number as ASCII string. "0003" = 3 |
| `FA` | Auxiliary field |
| `$string-encoded-key` | May contain arbitrary metadata |
| `$string-encoded-value` | such as Redis version, creation time, used memory, ... |
| `FE 00` | Indicates database selector. db number = 00 |
| `FB` | Indicates a resizedb field |
| `$length-encoded-int` | Size of the corresponding hash table |
| `$length-encoded-int` | Size of the corresponding expire hash table |
| `FD $unsigned-int` | "expiry time in seconds", followed by 4 byte unsigned int |
| `$value-type` | 1 byte flag indicating the type of value |
| `$string-encoded-key` | The key, encoded as a redis string |
| `$encoded-value` | The value, encoding depends on $value-type |
| `FC $unsigned long` | "expiry time in ms", followed by 8 byte unsigned long |
| `$value-type` | 1 byte flag indicating the type of value |
| `$string-encoded-key` | The key, encoded as a redis string |
| `$encoded-value` | The value, encoding depends on $value-type |
| `$value-type` | key-value pair without expiry |
| `$string-encoded-key` | |
| `$encoded-value` | |
| `FE $length-encoding` | Previous db ends, next db starts. |
| `...` | Additional key-value pairs, databases, ... |
| `FF` | End of RDB file indicator |
| `8-byte-checksum` | CRC64 checksum of the entire file. |



## Op Codes
Each part after the initial header is introduced by a special op code. The available op codes are:

Byte	Name	Description
0xFF	EOF	End of the RDB file
0xFE	SELECTDB	Database Selector
0xFD	EXPIRETIME	Expire time in seconds, see Key Expiry Timestamp
0xFC	EXPIRETIMEMS	Expire time in milliseconds, see Key Expiry Timestamp
0xFB	RESIZEDB	Hash table sizes for the main keyspace and expires, see Resizedb information
0xFA	AUX	Auxiliary fields. Arbitrary key-value settings, see Auxiliary fields



## Length Encoding
Length encoding is used to store the length of the next object in the stream. Length encoding is a variable byte encoding designed to use as few bytes as possible.

This is how length encoding works : Read one byte from the stream, compare the two most significant bits:

| Bits | How to Parse |
| --- | --- |
| `00` | The next 6 bits represent the length |
| `01` | Read one additional byte. The combined 14 bits represent the length |
| `10` | Discard the remaining 6 bits. The next 4 bytes from the stream represent the length |
| `11` | The next object is encoded in a special format. The remaining 6 bits indicate the format. May be used to store numbers or Strings, see String |

### Encoding
As a result of this encoding:

Numbers up to and including 63 can be stored in 1 byte
Numbers up to and including 16383 can be stored in 2 bytes
Numbers up to 2^32 -1 can be stored in 4 bytes