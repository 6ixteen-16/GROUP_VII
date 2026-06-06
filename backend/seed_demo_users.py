#!/usr/bin/env python
"""
Run to seed demo users.
Usage: python seed_demo_users.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

PASSWORD = 'Pass@1234'

students = [
    ('aisha.nakato',     'Aisha',     'Nakato',     '22/U/0002/PS'),
    ('brian.otieno',     'Brian',     'Otieno',     '22/U/0003/PS'),
    ('cynthia.namukasa', 'Cynthia',   'Namukasa',   '22/U/0004/PSA'),
    ('david.mugisha',    'David',     'Mugisha',    '22/U/0005/PSA'),
    ('esther.atim',      'Esther',    'Atim',       '22/U/0006/PS'),
    ('frank.ssemakula',  'Frank',     'Ssemakula',  '22/U/0007/PS'),
    ('grace.apio',       'Grace',     'Apio',       '22/U/0008/PSA'),
    ('henry.kato',       'Henry',     'Kato',       '22/U/0009/PSA'),
    ('irene.nankunda',   'Irene',     'Nankunda',   '22/U/0010/PSA'),
    ('joel.byarugaba',   'Joel',      'Byarugaba',  '22/U/0011/PS'),
]

workplace_supervisors = [
    ('robert.tumwebaze', 'Robert',   'Tumwebaze', 'Stanbic Bank Uganda'),
    ('patricia.nalwoga', 'Patricia', 'Nalwoga',   'MTN Uganda'),
]

academic_supervisors = [
    ('james.lwanga',  'James',  'Lwanga',  'Department of Computer Science', 'Makerere University'),
    ('sarah.nabwire', 'Sarah',  'Nabwire', 'Department of Computer Science', 'Makerere University'),
]

# Students
for username, first, last, student_id in students:
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(
            username=username,
            password=PASSWORD,
            email=f'{username}@iles.ac.ug',
            first_name=first,
            last_name=last,
            role='student',
            student_id=student_id,
            is_active=True,
        )
        print(f'✓ Student: {username}')
    else:
        print(f'  Already exists: {username}')

# Workplace Supervisors
for username, first, last, organization in workplace_supervisors:
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(
            username=username,
            password=PASSWORD,
            email=f'{username}@iles.ac.ug',
            first_name=first,
            last_name=last,
            role='workplace_supervisor',
            organization=organization,
            is_active=True,
        )
        print(f'✓ Workplace Supervisor: {username}')
    else:
        print(f'  Already exists: {username}')

# Academic Supervisors
for username, first, last, department, organization in academic_supervisors:
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(
            username=username,
            password=PASSWORD,
            email=f'{username}@iles.ac.ug',
            first_name=first,
            last_name=last,
            role='academic_supervisor',
            department=department,
            organization=organization,
            is_active=True,
        )
        print(f'✓ Academic Supervisor: {username}')
    else:
        print(f'  Already exists: {username}')

print('\n Demo users seeded successfully!')
print(f'Password for all: {PASSWORD}')