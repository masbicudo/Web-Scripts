function expm(A) {
    normmax = numeric.norminf
    div = numeric.div
    mmul = numeric.dot
    add = numeric.add
    mul = numeric.mul
    muli = numeric.muleq
    addi = numeric.addeq
    mmuli = numeric.dot
    eye = numeric.identity
    subi = numeric.subeq

    // constants for pade approximation
    var c0 = 1.0;
    var c1 = 0.5;
    var c2 = 0.12;
    var c3 = 0.01833333333333333;
    var c4 = 0.0019927536231884053;
    var c5 = 1.630434782608695E-4;
    var c6 = 1.0351966873706E-5;
    var c7 = 5.175983436853E-7;
    var c8 = 2.0431513566525E-8;
    var c9 = 6.306022705717593E-10;
    var c10 = 1.4837700484041396E-11;
    var c11 = 2.5291534915979653E-13;
    var c12 = 2.8101705462199615E-15;
    var c13 = 1.5440497506703084E-17;

    var j = Math.max(0, 1 + Math.floor(Math.log(normmax(A)) / Math.log(2)));
    var As = div(A, Math.pow(2, j)); // scaled version of A
    var n = A.length;

    // calculate D and N using special Horner techniques
    var As_2 = mmul(As, As);
    var As_4 = mmul(As_2, As_2);
    var As_6 = mmul(As_4, As_2);
    // U = c0*I + c2*A^2 + c4*A^4 + (c6*I + c8*A^2 + c10*A^4 + c12*A^6)*A^6
    var U = eye(n);
    muli(U, c0);
    addi(U, mul(As_2, c2));
    addi(U, mul(As_4, c4));
    var U2 = eye(n);
    muli(U2, c6);
    addi(U2, mul(As_2, c8));
    addi(U2, mul(As_4, c10));
    addi(U2, mul(As_6, c12));
    U2 = mmuli(U2, As_6);
    addi(U, U2);
    
    // V = c1*I + c3*A^2 + c5*A^4 + (c7*I + c9*A^2 + c11*A^4 + c13*A^6)*A^6
    var V = eye(n);
    muli(V, c1);
    addi(V, mul(As_2, c3));
    addi(V, mul(As_4, c5));
    var V2 = eye(n);
    muli(V2, c7);
    addi(V2, mul(As_2, c9));
    addi(V2, mul(As_4, c11));
    addi(V2, mul(As_6, c13));
    V2 = mmuli(V2, As_6);
    addi(V, V2);

    var AV = mmuli(As, V);
    var N =  add(U, AV);
    var D =  subi(U, AV);

    // solve DF = N for F
    var F = mdiv(N, D);
    //var F = svdsolve(D, N);

    // now square j times
    for (var k = 0; k < j; k++) {
        F = mmuli(F, F);
    }

    return F;
}

function mdiv(n, d) {
    var inv = numeric.inv(d)
    var r = numeric.dot(inv, n)
    return r
}

function diag(d) {
    var r = [];
    for (var i = 0; i < d.length; i++) {
        r[i] = []
        for (var j = 0; j < d.length; j++)
            r[i][j] = i == j ? d[i] : 0;
    }
    return r
}

function diaginv(d) {
    var r = [];
    for (var i = 0; i < d.length; i++) {
        r[i] = []
        for (var j = 0; j < d.length; j++)
            r[i][j] = i == j ? 1/d[i] : 0;
    }
    return r
}

function pinv(m) {
    var svd = numeric.svd(m)
    var u = svd.U;
    var s = svd.S;
    var v = svd.V;
    var r = numeric.dot(v, numeric.dot(diaginv(s), numeric.transpose(u)))
    return r
}

function svdsolve(a, b) {
    // x= V*((U'*b)./diag(S))
    var svd = numeric.svd(a)
    var u = svd.U;
    var s = svd.S;
    var v = svd.V;

    // x = v * (u' * b \ s) = v * (u' \ s * b) = v * (1 \ s * u' * b) = v * s^-1 * u' * b = pinv(a) * b
    var x = numeric.dot(pinv(a), b)

    return x
}
