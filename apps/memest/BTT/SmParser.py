#encoding=euc-kr
import os
import sys
from UserDict import UserDict

def copyFile(fromFile, toFile):
    "파일을 copy해준다."
    fin = open(fromFile, "rb")
    fromData = fin.read()
    fin.close()

    fout = open(toFile, "wb")
    fout.write(fromData)
    fout.close()

def stripnulls(data):
    "strip whitespace and nulls"
    return data.replace("\00", "").strip()

class FileInfo(UserDict):
    "store file metadata"
    def __init__(self, filename=None):
        UserDict.__init__(self)
        self["name"] = filename

dirOrgData = "C:\\Program Files\\palmOne\\Kimilh\\Backup\\"
dirInputData = "temp\\"
dirOutputData = "temp\\"
fileList = ['sm__5_8_60구절.pdb', "sm__180구절.pdb", "sm__dep.pdb", "sm__oyo.pdb" ]

class SmParser(FileInfo):
    startStringMap = { "sm__5_8_60구절.pdb" : "요일 5:11,12",
                        "sm__180구절.pdb" : "요 1: 1,14",
                        "sm__dep.pdb" : "고후13: 5",
                        "sm__oyo.pdb" : "골 3:12" }

    outFileNameMap = { "sm__5_8_60구절.pdb" : "card60.txt",
                        "sm__180구절.pdb" : "card180.txt",
                        "sm__dep.pdb" : "cardDEP.txt",
                        "sm__oyo.pdb" : "cardOYO.txt" }

    # 파일 안에서 파싱할 데이터의 첫 위치 부터의 데이터를 반환
    def __seekStartPoint(self, filename):
        startPoint = self.startStringMap.get(filename)
        self.clear()
        try:                               
            fp = open(dirInputData + filename, "rb", 0)
            try:                           
                fileData = fp.read()
#                print "filename=" + filename
#                print "startPoint=" + startPoint
                index = fileData.index(startPoint)
                print "%s=%d" % (filename, index)
                return fileData[index:]
            finally:                       
                fp.close()              
        except IOError:                    
            print filename + " is Not Exist"
            return None
        
    def __parse(self, filename):
        fileData = self.__seekStartPoint(filename)
        if fileData == None:
            return

        cardList = []
        card = []
        #print fileData[0:index]
        print 'fileName=%s, len=%d' % (filename, len(fileData))

        idxStart = 0
        idxEnd = 0
        fieldIdx = 0
        headerSkipCount = 0

        for c in fileData:
            # 각 카드별로 구분되어 있는 20바이트 날려버리기.
            if headerSkipCount > 0:
                idxEnd += 1
                idxStart += 1
                headerSkipCount -= 1
                continue

            # NULL값을 발견하면 카드의 1 Field를 append할 수 있다.
            if c == '\0':
                #KIH:                 print fileData[idxStart:idxEnd]
                aField = fileData[idxStart:idxEnd]

                # fieldIdx 가 0이면 장절 값인데, 이 값에 ":"가 없으면 가비지 데이터로 보고 Parsing 끝냄.
                idxEnd += 1
                idxStart = idxEnd
                if fieldIdx == 0 and aField.find(":") == -1:
                    continue

                card.append(aField.replace('\n', '@&') )
                fieldIdx += 1
            else:
                idxEnd += 1

            # Field를 6개 만들면 카드 하나가 완성되므로, cardList에 추가한다.
            # 나머지 값들도 reset한다.
            if fieldIdx == 6:
#                for w in card:
#                    print w,
#                print
#KIH:                 print "##################################"
                cardList.append(card)
                card = []
                headerSkipCount = 20
                fieldIdx = 0

        # 파싱이 끝나면 파일에 쓴다.
        self.__writeContents(filename, cardList)

            #테스트를 위해 2000 byte만 해본다.
#            if idxEnd > 2000:
#                return

#            print "%d = %s : %s" % (i, str(fileData[i] == '\0'), hex(ord(fileData[i])) )

    def __writeContents(self, filename, cardList):
        newFileName = self.outFileNameMap.get(filename)
#KIH:         newFileName = os.path.splitext(filename)[0] + ".txt"
        try:                               
            fp = open(dirOutputData + newFileName, "w")
            try:                           
                for card in cardList:
                    aRecord = '\t'.join(card) + '\n'
                    fp.write(aRecord)
            finally:                       
                fp.close()              
        except IOError:                    
            pass                           

    # 이곳은 self["name"] = var 등과 같이 변수를 세팅할 때, 자동으로 호출된다.
    def __setitem__(self, key, item):
        if key == "name" and item:
            self.__parse(item)
        # 아래는 상위 클래스인 FileInfo클래스의 메소드를 호출하는 것이다. (자바의 super.method(xx))
        FileInfo.__setitem__(self, key, item)

#KIH: def listDirectory(directory, filePrefix, fileExtList):                                        
#KIH:     "get list of file info objects for files of particular extensions"
    # 지정한 디렉토리의 파일 리스트 가져오기.
#KIH:     fileList = [os.path.normcase(f) for f in os.listdir(directory)]           
    # 확장자와 prefix가 매치하는 파알들만 골라내기. 
#KIH:     fileList = [ f for f in fileList
#KIH:             if (os.path.splitext(f)[1] in fileExtList and os.path.splitext(f)[0].startswith(filePrefix)) ] 
#KIH:     return fileList


if __name__ == "__main__":
    #KIH:     for file in listDirectory(".", "sm_", [".pdb"]):
    for file in fileList:
        copyFile(dirOrgData + file, dirInputData + file)    # palmOne에서 원본 파일을 copy한 다음,
        sm = SmParser(file)    # 원본 파일을 파싱해서 BTT용 데이터를 만듦.
