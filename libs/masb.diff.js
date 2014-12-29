/// <summary>
/// Longest common subsequence.
/// </summary>

(function(){
    // file scope function
    extend(this, { Masb: { Diff: {
            findEqs: function(a, b) {
                var eqsa = [];
                for (var ita = 0; ita < a.length; ita++) {
                    for (var itb = 0; itb < b.length; itb++) {
                        var ln = 0;
                        while (a[ita+ln] == b[itb+ln]) ln++;
                        var eqa = eqsa[ita] || (eqsa[ita] = []);
                        eqa[ln] = ita+ln;
                    }
                }
                return eqsa;
            }
        } } });
    
})();
