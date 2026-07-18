"use client";

function FeaturedSchoolCard({ school }) {
  return (
    <article className="edu-featured-card">
      <h3 className="edu-school-name">{school.name}</h3>
      <p className="edu-school-meta">
        {school.grades}
        <span className="edu-dot">·</span>
        {school.driveTime} drive
      </p>
      {school.description && <p className="edu-school-desc">{school.description}</p>}
    </article>
  );
}

function PrivateSchoolCard({ school }) {
  return (
    <article className="edu-private-card">
      <h3 className="edu-school-name">{school.name}</h3>
      <p className="edu-school-meta">
        {school.grades}
        <span className="edu-dot">·</span>
        {school.driveTime} drive
      </p>
      {school.description && <p className="edu-school-desc">{school.description}</p>}
    </article>
  );
}

function HigherEdCard({ school }) {
  return (
    <article className="edu-higher-card">
      <h3 className="edu-school-name">{school.name}</h3>
      <p className="edu-school-meta">
        {school.institutionType}
        <span className="edu-dot">·</span>
        {school.driveTime} drive
      </p>
      {school.description && <p className="edu-school-desc">{school.description}</p>}
    </article>
  );
}

function DistrictStats({ district }) {
  const stats = [
    district.enrollment && { label: "Enrollment", value: district.enrollment },
    district.schoolCount && { label: "Schools", value: district.schoolCount },
    district.graduationRate && { label: "Graduation rate", value: district.graduationRate },
    district.studentTeacherRatio && { label: "Student–teacher ratio", value: district.studentTeacherRatio },
  ].filter(Boolean);

  if (!stats.length) return null;

  return (
    <div className="edu-district-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="edu-district-stat">
          <span className="edu-district-stat-label">{stat.label}</span>
          <span className="edu-district-stat-value">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

function EducationSkeleton() {
  return (
    <div className="edu-skeleton">
      <div className="edu-skel-line wide" />
      <div className="edu-skel-block" />
      <div className="edu-skel-block short" />
    </div>
  );
}

export default function EducationSchoolsSection({ data, loading }) {
  if (loading) {
    return (
      <section className="edu-section" aria-labelledby="edu-heading">
        <div className="section-label" id="edu-heading">Education &amp; Schools</div>
        <EducationSkeleton />
      </section>
    );
  }

  if (!data?.ok) return null;

  const { summary, district, featuredPublic, privateSchools, higherEd } = data;
  const hasHigher = higherEd?.communityCollege || higherEd?.university;
  const hasContent =
    district?.name || featuredPublic?.length > 0 || privateSchools?.length > 0 || hasHigher;

  if (!hasContent) return null;

  return (
    <section className="edu-section" aria-labelledby="edu-heading">
      <div className="edu-section-head">
        <div className="section-label" id="edu-heading">Education &amp; Schools</div>
        {summary && <p className="edu-summary">{summary}</p>}
      </div>

      {district?.name && (
        <div className="edu-block">
          <div className="edu-block-title">🏫 Public School District</div>
          <div className="edu-district-card">
            <div className="edu-district-name">{district.name}</div>
            <DistrictStats district={district} />
          </div>
        </div>
      )}

      {featuredPublic?.length > 0 && (
        <div className="edu-block">
          <div className="edu-block-title">📚 Featured Public Schools</div>
          <div className="edu-featured-grid">
            {featuredPublic.map((school) => (
              <FeaturedSchoolCard key={school.name} school={school} />
            ))}
          </div>
        </div>
      )}

      {privateSchools?.length > 0 && (
        <div className="edu-block">
          <div className="edu-block-title">Private Schools</div>
          <div className="edu-private-grid">
            {privateSchools.map((school) => (
              <PrivateSchoolCard key={school.name} school={school} />
            ))}
          </div>
        </div>
      )}

      {hasHigher && (
        <div className="edu-block">
          <div className="edu-block-title">Higher Education</div>
          <div className="edu-higher-grid">
            {higherEd.communityCollege && (
              <HigherEdCard school={higherEd.communityCollege} />
            )}
            {higherEd.university && <HigherEdCard school={higherEd.university} />}
          </div>
        </div>
      )}
    </section>
  );
}
