function getPlatformName() {
    var xp = /WINDOWS NT 5.[\d]+/;
    var win7 = /WINDOWS NT 6.[\d]+/;
    var win8 = /WINDOWS NT 7.[\d]+/;
    var win = /WINDOWS NT [\d\.]+/;
    var winphone = /WINDOWS PHONE/;
    var android = /ANDROID [\d\.]+/;
    var iphone = /IPHONE [\d\_]+/;
    var ipad = /IPAD/;
    var userAgent = navigator.userAgent.toLocaleUpperCase();
    if (xp.test(userAgent)) return "Windows XP";
    if (win7.test(userAgent)) return "Windows 7";
    if (win8.test(userAgent)) return "Windows 8";
    if (win.test(userAgent)) return win.exec(userAgent);
    if (winphone.test(userAgent)) return "Windows Phone";
    if (android.test(userAgent)) return android.exec(userAgent);
    if (iphone.test(userAgent)) return "IPhone";
    if (ipad.test(userAgent)) return "IPad";
    return "Other Platform";
}

function getBrowserName() {
    var userAgent = navigator.userAgent.toLocaleUpperCase();
    var msie = /MSIE [\d\.]+/;
    var firefox = /FIREFOX\/[\d\.]+/;
    var chrome = /CHROME\/[\d\.]+/;
    var safari = /SAFARI\/[\d\.]+/;
    var opero = /OPR\/[\d\.]+/;
    var se = /SE \d/;
    var mi = /XIAOMI\/MIUIBROWSER/;
    var uc = /UCBROWSER/;
    var android = /ANDROID [\d\.]+/;
    if (msie.test(userAgent) && se.test(userAgent)) return "Sougo";
    if (msie.test(userAgent)) return msie.exec(userAgent);
    if (se.test(userAgent)) return "Sougo";
    if (uc.test(userAgent)) return "UC";
    //if (mi.test(userAgent)) return '小米手机内置浏览器';
    if (android.test(userAgent)) return "Android";
    if (opero.test(userAgent)) return "Opera";
    if (chrome.test(userAgent)) return chrome.exec(userAgent);
    if (safari.test(userAgent)) return safari.exec(userAgent);
    return "其他";
}
