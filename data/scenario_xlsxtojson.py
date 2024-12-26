# generate .json file from xlsx file
# evidence levels must be in the same order for each category
# categories must be in the same order as evtypes
# levels of the same category must occupy a contiguous set of columns
# scenario base column num (bind) must immediately precede evidence columns
# layperson crime summary must immediately precede base

import pandas as pd
import json

bind = 4
evtypes = ['physical', 'document', 'witness', 'character']
evlev = ['clear_in', 'clear_ex', 'ambiguous']
evlev = [evlev, evlev, evlev, evlev[0:2]]
shtrng = range(bind, bind+2+sum([len(ev) for ev in evlev]))
scenes = pd.read_csv('./data/Scenarios.csv', usecols=shtrng)

# cleanup
scenes = scenes.applymap(lambda x: x.replace('\n', '').strip())

sclist = []
# loop over scenarios
for sc in scenes.iterrows():
    ind = str(sc[0]+1)
    if len(ind) == 1:
        ind = '0' + ind
    cout = {'abbr': ind, 'base': sc[1][1], 'crime': sc[1][0]}
    vars = {}
    # loop over evidence pieces, counting from base
    i = 0
    for j, t in enumerate(evtypes):
        tmp = {}
        for l in evlev[j]:
            i += 1
            tmp[l] = sc[1][i+1]
        vars[t] = tmp
    cout['vars'] = vars
    sclist.append(cout)

outfile = open('Scenarios.json', mode='w', encoding='utf8')
json.dump(sclist, outfile, ensure_ascii=False)
outfile.close()
