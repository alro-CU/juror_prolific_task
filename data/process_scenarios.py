# this file opens a json file containing scenario data and creates
# another json file containing the names of scenario variables,
# the number of levels of each, and the labels of these levels

import json
import numpy as np


def makeCombos(levels):
    # levels is an iterable, each entry the number of distinct values
    # taken by some variable
    ranges = [range(n) for n in levels]
    idx = np.meshgrid(*ranges, indexing='ij')
    # idx is a list, same length as levels
    # need to flatten each entry in idx and concatenate the result
    variants = np.concatenate([ix.reshape((-1, 1)) for ix in idx], axis=1)
    return variants.tolist()

def extract(infile, outfile, impnull=True):
    indata = open(infile)
    data = json.load(indata)
    indata.close()

    example = data[0]
    variants = example['vars']

    outobj = {'vars': [], 'numlevels': [], 'levels': []}

    for key in variants:
        outobj['vars'].append(key)
        levels = list(variants[key].keys())
        if impnull:
            levels.append('none')
        outobj['levels'].append(levels)
        outobj['numlevels'].append(len(levels))

    allcombos = makeCombos(outobj['numlevels'])
    outobj['combinations'] = {'random': allcombos, 'credible': [], 'inculpatory': []}
    for combo in allcombos:
        if 0 in combo[0:3]:
            ninc  = sum(0 == np.array(combo))
            namb = sum(2 == np.array(combo[0:3]))
            nexc = sum(1 == np.array(combo))
            if (namb + ninc) >= nexc:
                outobj['combinations']['credible'].append(combo)
                if (namb == 0) and (nexc == 0):
                    outobj['combinations']['inculpatory'].append(combo)

        # if (0 in combo[0:3]):
        #     outobj['combinations']['credible'].append(combo)
        #     if not (1 in combo or 2 in combo[0:3]):
        #         outobj['combinations']['inculpatory'].append(combo)

    outdata = open(outfile, 'w')
    json.dump(outobj, outdata)
    outdata.close()


if __name__ == '__main__':
    extract('Scenarios.json', 'Structure.json')
