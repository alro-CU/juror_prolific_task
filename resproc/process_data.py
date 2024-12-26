import sys
import pymongo
import pandas as pd
from sshtunnel import SSHTunnelForwarder
from numpy import nan
#cpath = '/home/seth/code/casereveal/analysis/'
#sys.path.append(cpath)
from qualtricsimport import pullQualtrics

# dbname = 'exculpatory_preponderous'
fpath = 'respdata/'

def pullSurvey(fpath, dbname):
    # connect to server and mongodb
    # requires key access to server
    keypath = '~/.ssh/id_rsa'
    server = SSHTunnelForwarder(
        'skene.vm.duke.edu',
        ssh_pkey=keypath,
        remote_bind_address=('127.0.0.1', 27017))
    server.start()
    client = pymongo.MongoClient('127.0.0.1', server.local_bind_address[1])
    db = client[dbname]

    # process scenarios
    usrsc = list(db.scenarios.find({}))
    # scdf = pd.DataFrame()
    scs = list()
    # uids = list()
    # fin = list()
    subjdf = pd.DataFrame()
    scendf = pd.DataFrame()
    for usr in usrsc:
        # uids.append(usr['uid'])
        if 'completed' in usr.keys():
            # fin.append(usr['completed'])
            fin = usr['completed']
        else:
            fin = False
        usi = {'uid': usr['uid'], 'task_complete': fin, 'task': dbname}
        if 'condition' in usr.keys():
            for factor, level in usr['condition'].items():
                usi['cond_' + factor] = level
        subjdf = subjdf.append(usi, ignore_index=True)
        for sc in usr['text']:
            scd = {'uid': usr['uid'], 'scenario': int(sc['abbr'])}
            if 'condition' in sc.keys():
                for factor, level in sc['condition'].items():
                    scd['cond_' + factor] = level
            for ev in sc['evidenceSet']:
                scd[ev['type']] = ev['level']
            scendf = scendf.append(scd, ignore_index=True)

    # scdf = pd.DataFrame(scs)
    # scdf = scdf[['uid', 'scenario', 'physical', 'document', 'witness', 'character']]
    # subjdf = pd.DataFrame.from_dict({'uid': uids, 'task_complete': fin, 'task': dbname})

    # load clicks data
    clicks = list(db.clicks.find({'uid': {'$exists': True}}))
    clickdf = pd.DataFrame(clicks)
    clickdf = clickdf.drop(['_id', '__v'], axis=1)

    # load catch trials
    catchdf = pd.DataFrame()
    usrct = list(db.catches.find({}))

    for usr in usrct:
        for j, ans in enumerate(usr['usrAns']):
            if (j < len(usr['whichScenNum'])):
                qnum = usr['whichScenNum'][j]-1
                ctmp = ans == usr['whichCorr'][j]
                ttmp = usr['qType'][j]
                try:
                    stmp = clickdf[(clickdf.uid == usr['uid']) & (clickdf.question == qnum)].scenario.iat[0]
                except IndexError:
                    print('Problem with catch trial alignment; user ' + usr['uid'] +
                          ' may have quit and resumed mid-task.')
                    stmp = nan
            else:
                ctmp = nan
                stmp = nan
                ttmp = nan
            cti = {'uid': usr['uid'], 'type': ttmp, 'correct': ctmp, 'scenario': stmp}
            catchdf = catchdf.append(cti, ignore_index=True)

    client.close()
    server.stop()

    # aggregate useful diagnostics into subjdf
    # subjdf = pd.DataFrame.from_dict({'uid': uids, 'task_complete': fin, 'task': dbname})
    subjdf = subjdf.merge(catchdf.groupby('uid')['correct'].agg([len, sum]), how='left', on='uid')
    subjdf = subjdf.merge(clickdf.groupby('uid')['scenario'].nunique(), how='left', on='uid')
    subjdf = subjdf.merge(clickdf.groupby('uid')['start'].first(), how='left', on='uid')
    subjdf.rename(columns={'sum': 'num_correct', 'len': 'num_catch'}, inplace=True)

    # merge into df
    #df = pd.merge(df, dgdf, how='left', on='uid')

    catchdf.to_csv(fpath + dbname + '_catches.csv')
    clickdf.to_csv(fpath + dbname + '_answers.csv')
    scendf.to_csv(fpath + dbname + '_realized_scen.csv')
    subjdf.to_csv(fpath + dbname + '_subjectinfo.csv')



if __name__ == '__main__':
    if len(sys.argv) > 1:
        dbs2pull = sys.argv[1:]
    else:
        dbs2pull = ['exculpatory_preponderous',
        'exculpatory_burdenofproof',
        'exculpatory_pilot',
        'exculpatory_conditional',
        'exculpatory_rateless']

    for dbname in dbs2pull:
        pullQualtrics(fpath, dbname)
        pullSurvey(fpath, dbname)
