import requests
import io
import os
import sys
from zipfile import ZipFile


# Setting user Parameters
def pullQualtrics(fpath, dbname):
    if dbname == 'exculpatory_preponderous':
        surveyId = 'SV_1IgHz9CqQIuVTyR'
    else:
        surveyId = 'SV_5jnTU8sDsKrHqCx'

    try:
        apiToken = os.environ['X_API_TOKEN']
    except KeyError:
        print("set environment variable X_API_TOKEN")
        sys.exit(2)

    fileFormat = "csv"
    dataCenter = 'duke.ca1'

    # Setting static parameters
    requestCheckProgress = 0.0
    progressStatus = "inProgress"
    baseUrl = "https://{0}.qualtrics.com/API/v3/surveys/{1}/export-responses/".format(dataCenter, surveyId)
    headers = {
        "content-type": "application/json",
        "x-api-token": apiToken,
        }

    # Step 1: Creating Data Export
    downloadRequestUrl = baseUrl
    downloadRequestPayload = '{"format":"' + fileFormat + '"}'
    downloadRequestResponse = requests.request("POST", downloadRequestUrl,
                                               data=downloadRequestPayload,
                                               headers=headers)
    progressId = downloadRequestResponse.json()["result"]["progressId"]

    # Step 2: Checking on Data Export Progress and waiting until export is ready
    while progressStatus != "complete" and progressStatus != "failed":
        requestCheckUrl = baseUrl + progressId
        requestCheckResponse = requests.request("GET", requestCheckUrl, headers=headers)
        requestCheckProgress = requestCheckResponse.json()["result"]["percentComplete"]
        progressStatus = requestCheckResponse.json()["result"]["status"]

    # step 2.1: Check for error
    if progressStatus == "failed":
        raise Exception("export failed")

    fileId = requestCheckResponse.json()["result"]["fileId"]

    # Step 3: Downloading file
    requestDownloadUrl = baseUrl + fileId + '/file'
    requestDownload = requests.request("GET", requestDownloadUrl, headers=headers,
                                       stream=True)

    # Step 4: Unzipping the file
    qualzip = ZipFile(io.BytesIO(requestDownload.content))
    qualzip.extractall(fpath)
    os.rename(fpath + qualzip.namelist()[0], fpath + dbname + "_qualtrics.csv")
