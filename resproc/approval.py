import boto3
import pandas as pd

whichtask = 'capstone'
fpath = 'respdata/'

subjdf = pd.read_csv(fpath + whichtask + '_subjectinfo.csv')
client = boto3.client('mturk')
hitlst = client.list_reviewable_hits()['HITs']


for hit in hitlst:
    hid = hit['HITId']
    asslst = client.list_assignments_for_hit(HITId=hid,MaxResults=100)['Assignments']
    bonlst = client.list_bonus_payments(HITId=hid,MaxResults=100)['BonusPayments']

    bonass = list()
    for bon in bonlst:
        bonass.append(bon['AssignmentId'])

    for ass in asslst:
        wid = ass['WorkerId']
        aid = ass['AssignmentId']
        wout = subjdf.loc[subjdf['uid'] == wid]

        if ass['AssignmentStatus'] == 'Submitted':
            if len(wout) > 1:
                print(wid + ' is not approved: previously completed task.')
            elif len(wout) == 0:
                print(wid + ' does not appear in the data set.')
            elif wout['scenario'].squeeze() < 5:
                print(wid + ' is not approved: did not complete 5 questions.')
            elif wout['scenario'].squeeze() >= 5:
                    client.approve_assignment(AssignmentId=aid)

        if (aid not in bonass) and (ass['AssignmentStatus'] == 'Approved'):
            bonused = wout['task_complete'].squeeze()
            if (len(wout) > 0) and (bonused):
                client.send_bonus(WorkerId=wid, AssignmentId=aid, BonusAmount='4.00',
                Reason='Successful completion of survey.')
                print(wid + ' recieved bonus.')
            else:
                print(wid + ' did not recieve a bonus.')
