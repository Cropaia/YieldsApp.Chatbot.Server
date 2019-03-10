


const fetch = require('node-fetch');
const moment = require('moment');
const _ = require('lodash');

const BaseAwareAPi = "https://api.awhere.com";
const AwareKey = "0tdPNlr1ABfhvDMmedNLnhCAfhPGUmAc";
const AwareSecret = "yqrDe4uf0NSy5YNe";


getAwareNorms = async (location,startDate) => {
    let userId = +new Date();
    const field = await _createField(userId, location);
    const norms= await _getNorms(field.id, startDate);
    const result= {
        temperature: _.map(norms, (norm)=>{
            return {
                date: norm.day,
                max: Math.round(norm.maxTemp.average),
                min: Math.round(norm.minTemp.average),
                units: norm.minTemp.units
            }
        }),
        humidity:  _.map(norms, (norm)=>{
            return {
                date: norm.day,
                max: Math.round(norm.maxHumidity.average),
                min: Math.round(norm.minHumidity.average)
            }
        })
    }
    await _deleteField(field.id);
    return result;

}


_getNorms = async (fieldId, startDate) => {
    const formatDate= 'MM-DD';
    const sDate=moment(startDate) , eDate= moment(Date.now());
    const fsDate= sDate.format(formatDate, { trim: false }), feDate=eDate.format(formatDate, { trim: false });
    let url = `${BaseAwareAPi}/v2/weather/fields/${fieldId}/norms/${fsDate},${feDate}`;
    if (sDate.year() != eDate.year()) {
        url = url + "/years/" + sDate.year() + "," + eDate.year();
    }

    const token = await _getToken();

    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }
    const response = await fetch(url, options);
    const responseData = await response.json();
    return responseData.norms;
}
_createField = async (userId, location) => {
    const token = await _getToken();
    const url = BaseAwareAPi + "/v2/fields";
    const field = {
        "id": "field" + userId,
        "name": "User Id Field" + userId,
        "farmId": "farm1",
        "centerPoint": location
    };
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(field)
    }
    const response = await fetch(url, options);
    const responseData = await response.json();
    return responseData;

}

_deleteField = async (fieldId) => {
    const token = await _getToken();
    const url = BaseAwareAPi + "/v2/fields/" + fieldId;
    const options = {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }
    const response = await fetch(url, options);
    return true;
}



_getToken = async () => {
    const url = BaseAwareAPi + "/oauth/token";
    const authToken = Buffer.from(`${AwareKey}:${AwareSecret}`).toString('base64');
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Basic ` + authToken,
            'content-type': 'application/x-www-form-urlencoded',
        },
        body: "grant_type=client_credentials"

    }
    const response = await fetch(url, options);
    const data = await response.json();
    return data.access_token;
}
exports.getAwareNorms = getAwareNorms;
