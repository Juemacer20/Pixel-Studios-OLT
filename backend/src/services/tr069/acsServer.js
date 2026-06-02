const express = require('express');
const xml2js = require('xml2js');
const prisma = require('../../config/database');
const logger = require('../../middleware/logger');

const router = express.Router();

const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
const builder = new xml2js.Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } });

router.post('/acs', express.text({ type: ['text/xml', 'application/xml', 'application/soap+xml'] }), async (req, res) => {
  try {
    const body = req.body;
    if (!body) {
      return res.status(200).send(buildEmptyResponse());
    }

    const parsed = await parser.parseStringPromise(body);
    const envelope = parsed?.['SOAP-ENV:Envelope'] || parsed?.Envelope;
    const body2 = envelope?.['SOAP-ENV:Body'] || envelope?.Body;

    const inform = body2?.['cwmp:Inform'] || body2?.Inform;
    if (inform) {
      await handleInform(inform, req, res);
      return;
    }

    res.status(200).send(buildEmptyResponse());
  } catch (err) {
    logger.error(`ACS error: ${err.message}`);
    res.status(500).send();
  }
});

async function handleInform(inform, req, res) {
  const sn = inform?.DeviceId?.SerialNumber || inform?.['DeviceId']?.['SerialNumber'];
  const oui = inform?.DeviceId?.OUI;
  const manufacturer = inform?.DeviceId?.Manufacturer;
  const productClass = inform?.DeviceId?.ProductClass;
  const swVersion = inform?.ParameterList?.ParameterValueStruct?.find?.(p => p.Name?.includes('SoftwareVersion'))?.Value;

  const ip = req.ip || req.connection?.remoteAddress;

  if (sn) {
    await prisma.tR069Device.upsert({
      where: { serial_number: sn },
      update: { ip_address: ip, last_inform: new Date(), oui, manufacturer, product_class: productClass, software_version: swVersion },
      create: { serial_number: sn, oui, manufacturer, product_class: productClass, ip_address: ip, last_inform: new Date(), software_version: swVersion },
    });
    logger.info(`TR-069 Inform: SN=${sn} IP=${ip}`);
  }

  res.status(200).set('Content-Type', 'text/xml').send(buildInformResponse());
}

function buildInformResponse() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <SOAP-ENV:Body>
    <cwmp:InformResponse><MaxEnvelopes>1</MaxEnvelopes></cwmp:InformResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function buildEmptyResponse() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body/>
</SOAP-ENV:Envelope>`;
}

module.exports = router;
