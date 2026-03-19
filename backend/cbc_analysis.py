"""
CBC (Competency Based Curriculum) Analysis Engine
Processes raw scores into CBC framework metrics
"""

from collections import defaultdict

# CBC Competency Mapping
# AE (Above Expectations), ME (Meeting Expectations), BE (Below Expectations)
COMPETENCY_MAPPING = {
    'AE1': {'range': (90, 100), 'points': 4, 'label': 'Above Expectations 1'},
    'AE2': {'range': (80, 89), 'points': 3, 'label': 'Above Expectations 2'},
    'ME1': {'range': (65, 79), 'points': 3, 'label': 'Meeting Expectations 1'},
    'ME2': {'range': (50, 64), 'points': 2, 'label': 'Meeting Expectations 2'},
    'BE1': {'range': (40, 49), 'points': 1, 'label': 'Below Expectations 1'},
    'BE2': {'range': (0, 39), 'points': 0, 'label': 'Below Expectations 2'},
}


def get_competency(score):
    """
    Map a numeric score to CBC competency level
    Returns: (competency_code, points)
    """
    if score >= 90:
        return 'AE1', 4
    elif score >= 80:
        return 'AE2', 3
    elif score >= 65:
        return 'ME1', 3
    elif score >= 50:
        return 'ME2', 2
    elif score >= 40:
        return 'BE1', 1
    else:
        return 'BE2', 0


def calculate_subject_mean_points(grades):
    """
    Calculate Subject Mean Points (SMP) / Quality Index
    
    SMP = ((Count_EE1 * 4) + (Count_EE2 * 3) + (Count_ME1 * 2) + (Count_ME2 * 1)) / Total Students
    
    Args:
        grades: List of grade dictionaries with 'score' field
        
    Returns:
        Dictionary with SMP and breakdown
    """
    if not grades:
        return {
            'smp': 0,
            'total_students': 0,
            'breakdown': {'EE1': 0, 'EE2': 0, 'ME1': 0, 'ME2': 0, 'BE': 0}
        }
    
    # Count competencies
    counts = {'AE1': 0, 'AE2': 0, 'ME1': 0, 'ME2': 0, 'BE1': 0, 'BE2': 0}
    
    for grade in grades:
        score = grade.get('score', 0)
        competency, _ = get_competency(score)
        counts[competency] += 1
    
    total_students = len(grades)
    
    # Calculate SMP (Quality Index)
    smp = (
        (counts['AE1'] * 4) +
        (counts['AE2'] * 3) +
        (counts['ME1'] * 3) +
        (counts['ME2'] * 2) +
        (counts['BE1'] * 1)
    ) / total_students if total_students > 0 else 0
    
    return {
        'smp': round(smp, 2),
        'total_students': total_students,
        'competencies': counts,
        'breakdown': counts,
        'percentages': {
            k: round((v / total_students) * 100, 1) for k, v in counts.items()
        }
    }


def calculate_stream_variance(stream_smp_data):
    """
    Compare SMP between different streams for the same subject
    
    Args:
        stream_smp_data: Dictionary of {stream_name: smp_value}
        
    Returns:
        Dictionary with variance analysis
    """
    if not stream_smp_data or len(stream_smp_data) < 2:
        return {
            'has_variance': False,
            'message': 'Need at least 2 streams to compare'
        }
    
    smp_values = list(stream_smp_data.values())
    max_smp = max(smp_values)
    min_smp = min(smp_values)
    avg_smp = sum(smp_values) / len(smp_values)
    
    # Find best and worst streams
    best_stream = max(stream_smp_data.items(), key=lambda x: x[1])
    worst_stream = min(stream_smp_data.items(), key=lambda x: x[1])
    
    return {
        'has_variance': True,
        'max_smp': max_smp,
        'min_smp': min_smp,
        'range': round(max_smp - min_smp, 2),
        'average_smp': round(avg_smp, 2),
        'best_stream': {'name': best_stream[0], 'smp': best_stream[1]},
        'worst_stream': {'name': worst_stream[0], 'smp': worst_stream[1]},
        'stream_data': stream_smp_data
    }


def calculate_value_add(current_smp, previous_smp):
    """
    Compare current SMP against previous term's SMP
    
    Args:
        current_smp: SMP for current term
        previous_smp: SMP for previous term
        
    Returns:
        Dictionary with value-add analysis
    """
    if previous_smp is None or previous_smp == 0:
        return {
            'has_comparison': False,
            'message': 'No previous term data available'
        }
    
    difference = current_smp - previous_smp
    percentage_change = (difference / previous_smp) * 100
    
    if difference > 0.2:
        trend = 'improving'
        interpretation = 'Students show significant improvement'
    elif difference > 0:
        trend = 'slight_improvement'
        interpretation = 'Students show slight improvement'
    elif difference < -0.2:
        trend = 'declining'
        interpretation = 'Student performance has declined significantly'
    elif difference < 0:
        trend = 'slight_decline'
        interpretation = 'Student performance has slightly declined'
    else:
        trend = 'stable'
        interpretation = 'Student performance remains stable'
    
    return {
        'has_comparison': True,
        'current_smp': current_smp,
        'previous_smp': previous_smp,
        'difference': round(difference, 2),
        'percentage_change': round(percentage_change, 1),
        'trend': trend,
        'interpretation': interpretation
    }


def calculate_pass_rate(grades, core_subjects=None):
    """
    Calculate Pass Rate: Percentage of students achieving at least BE1 (40%)
    
    Args:
        grades: List of grade dictionaries
        core_subjects: Optional list of core subject IDs to filter
        
    Returns:
        Dictionary with pass rate analysis
    """
    if not grades:
        return {
            'pass_rate': 0,
            'total_students': 0,
            'passed': 0,
            'failed': 0
        }
    
    passed = 0
    failed = 0
    
    for grade in grades:
        score = grade.get('score', 0)
        # Pass = score >= 40 (BE1 or above)
        if score >= 40:
            passed += 1
        else:
            failed += 1
    
    total = passed + failed
    pass_rate = (passed / total) * 100 if total > 0 else 0
    
    return {
        'pass_rate': round(pass_rate, 1),
        'total_students': total,
        'passed': passed,
        'failed': failed,
        'passed_percentage': round((passed / total) * 100, 1) if total > 0 else 0,
        'failed_percentage': round((failed / total) * 100, 1) if total > 0 else 0
    }


def analyze_class_performance(grades_by_subject, stream=None):
    """
    Comprehensive analysis of class performance
    
    Args:
        grades_by_subject: Dictionary of {subject_id: [grades]}
        stream: Optional stream name
        
    Returns:
        Complete analysis report
    """
    analysis = {
        'stream': stream,
        'subjects': {},
        'overall': {
            'total_students': 0,
            'class_smp': 0,
            'class_pass_rate': 0
        }
    }
    
    all_grades = []
    subject_smps = []
    
    for subject_id, grades in grades_by_subject.items():
        subject_analysis = calculate_subject_mean_points(grades)
        subject_analysis['pass_rate'] = calculate_pass_rate(grades)
        
        analysis['subjects'][subject_id] = subject_analysis
        
        all_grades.extend(grades)
        if subject_analysis['smp'] > 0:
            subject_smps.append(subject_analysis['smp'])
    
    # Calculate overall class metrics
    if all_grades:
        overall_smp = calculate_subject_mean_points(all_grades)
        overall_pass = calculate_pass_rate(all_grades)
        
        analysis['overall']['total_students'] = len(all_grades)
        analysis['overall']['class_smp'] = overall_smp['smp']
        analysis['overall']['class_pass_rate'] = overall_pass['pass_rate']
        
        if subject_smps:
            analysis['overall']['average_subject_smp'] = round(
                sum(subject_smps) / len(subject_smps), 2
            )
    
    return analysis


def generate_cbc_report(grades_data, exam_instance_id, previous_exam_id=None):
    """
    Generate a complete CBC analysis report
    
    Args:
        grades_data: List of grade objects with student, subject, score info
        exam_instance_id: Current exam ID
        previous_exam_id: Optional previous exam ID for value-add calculation
        
    Returns:
        Complete CBC report
    """
    # Group grades by subject
    grades_by_subject = defaultdict(list)
    
    for grade in grades_data:
        subject_id = grade.get('subjectId') or grade.get('subject_id')
        if subject_id:
            grades_by_subject[subject_id].append(grade)
    
    # Generate subject-level analysis
    subject_analysis = {}
    for subject_id, grades in grades_by_subject.items():
        smp_data = calculate_subject_mean_points(grades)
        pass_data = calculate_pass_rate(grades)
        
        subject_analysis[subject_id] = {
            'smp': smp_data['smp'],
            'total_students': smp_data['total_students'],
            'competencies': smp_data['competencies'],
            'breakdown': smp_data['breakdown'],
            'pass_rate': pass_data['pass_rate'],
            'competency_percentages': smp_data['percentages']
        }
    
    # Calculate overall class metrics
    all_grades = list(grades_by_subject.values())
    if all_grades:
        flat_grades = [g for subject_grades in all_grades for g in subject_grades]
        overall_smp = calculate_subject_mean_points(flat_grades)
        overall_pass = calculate_pass_rate(flat_grades)
        
        return {
            'exam_id': exam_instance_id,
            'subject_analysis': subject_analysis,
            'overall': {
                'class_smp': overall_smp['smp'],
                'total_students': overall_smp['total_students'],
                'pass_rate': overall_pass['pass_rate'],
                'competencies': overall_smp['competencies'],
                'competency_breakdown': overall_smp['breakdown']
            },
            # Placeholder for value-add (would need historical data)
            'value_add': None,
            'stream_variance': None
        }
    
    return {
        'exam_id': exam_instance_id,
        'subject_analysis': {},
        'overall': {},
        'error': 'No grades data available'
    }
