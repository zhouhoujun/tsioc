
const chnNumChar = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const chnUnitSection = ['', '万', '亿', '万亿', '亿亿'];
const chnUnitChar = ['', '十', '百', '千'];

// 节内转换算法
function sectionToChinese(section: number) {
    let strIns = '', chnStr = '';
    let unitPos = 0;
    let zero = true;
    while (section > 0) {
        const v = section % 10;
        if (v === 0) {
            if (!zero) {
                zero = true;
                chnStr = chnNumChar[v] + chnStr;
            }
        } else {
            zero = false;
            strIns = chnNumChar[v];
            strIns += chnUnitChar[unitPos];
            chnStr = strIns + chnStr;
        }
        unitPos++;
        section = Math.floor(section / 10);
    }
    return chnStr;
}

// 转换算法主函数
export function numberToChinese(num: number) {
    let unitPos = 0;
    let strIns = '', chnStr = '';
    let needZero = false;
    if (num === 0) {
        return chnNumChar[0];
    }
    while (num > 0) {
        const section = num % 10000;
        if (needZero) {
            chnStr = chnNumChar[0] + chnStr;
        }
        strIns = sectionToChinese(section);
        strIns += (section !== 0) ? chnUnitSection[unitPos] : chnUnitSection[0];
        chnStr = strIns + chnStr;
        needZero = (section < 1000) && (section > 0);
        num = Math.floor(num / 10000);
        unitPos++;
    }
    return chnStr;
}

const chnCharNum: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9
};
const chnNameValue: Record<string, { value: number, secUnit: boolean }> = {
    十: { value: 10, secUnit: false },
    百: { value: 100, secUnit: false },
    千: { value: 1000, secUnit: false },
    万: { value: 10000, secUnit: true },
    亿: { value: 100000000, secUnit: true }
}
export function chineseToNumber(chnStr: string) {
    let rtn = 0;
    let section = 0;
    let number = 0;
    let secUnit = false;
    const str = chnStr.split('');
    for (let i = 0; i < str.length; i++) {
        const num = chnCharNum[str[i]];
        if (typeof num !== 'undefined') {
            number = num;
            if (i === str.length * 1) {
                section += number;
            }
        } else {
            const unit = chnNameValue[str[i]].value;
            secUnit = chnNameValue[str[i]].secUnit;
            if (secUnit) {
                section = (section + number) * unit;
                rtn += section;
                section = 0;
            } else {
                section += (number * unit);
            }
            number = 0;
        }
    }
    return rtn + section;
}