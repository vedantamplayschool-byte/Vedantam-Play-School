import mongoose from 'mongoose';
import Parent from '../src/models/Parent.js';
import Student from '../src/models/Student.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const nameRegex = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

await mongoose.connect(uri);

try {
  const ajay = await Parent.findOne({ fatherName: nameRegex('Ajay Singh Rajpoot') });
  if (!ajay) throw new Error('Ajay Singh Rajpoot parent record was not found');

  const tanishka = await Student.findOne({ studentName: nameRegex('Tanishka Singh Rajpoot') });
  if (!tanishka) throw new Error('Tanishka Singh Rajpoot student record was not found');

  const ekanshi = await Student.findOne({ studentName: nameRegex('Ekanshi Pant') });

  tanishka.parent = ajay._id;
  tanishka.fatherName = tanishka.fatherName || ajay.fatherName;
  tanishka.fatherPhone = tanishka.fatherPhone || ajay.fatherPhone;
  tanishka.address = tanishka.address || ajay.address;
  await tanishka.save();

  if (ekanshi && String(ekanshi.parent || '') === String(ajay._id)) {
    ekanshi.parent = undefined;
    await ekanshi.save();
  }

  ajay.students = [tanishka._id];
  await ajay.save();

  console.log('Fixed Ajay Singh Rajpoot parent link: only Tanishka Singh Rajpoot remains linked.');
  if (ekanshi) console.log('Ekanshi Pant is no longer linked to Ajay Singh Rajpoot.');
} finally {
  await mongoose.disconnect();
}
