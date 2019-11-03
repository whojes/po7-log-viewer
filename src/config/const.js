const wsIp =  window.location.hostname === "localhost" ? "192.168.9.16" : window.location.hostname;
const wsPort = 16754

export const whojes = {
    wsUrl: `ws://${wsIp}:${wsPort}/`,
    regexHelp: "https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/%EC%A0%95%EA%B7%9C%EC%8B%9D",
    defaultFile: "ProObject.log",
}

export const VT = {
    authType: {
        PASSWORD: "password",
    },
    dynamicType: {
        STATIC: "static",
        DYNAMIC: "dynamic",
    },
    regexStyle: {
        BANISH: "banish",
        OPAQUE: "opaque",
    }
}

export const modalStyle = {
    content: {
        position: "absolute",
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-50%",
        transform: "translate(-50%, -50%)"
    },
    overlay: {
        zIndex: 3
    }
}
